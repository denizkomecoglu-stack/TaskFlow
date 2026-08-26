using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Models;
using Microsoft.AspNetCore.RateLimiting;
using BCrypt.Net;
using TaskFlow.API.Services;

namespace TaskFlow.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    private readonly IEmailService _emailService;

    // IConfiguration ile appsettings.json'daki JwtSettings'i okuyabileceğiz
    public AuthController(AppDbContext context, IConfiguration config, IEmailService emailService)
    {
        _context = context;
        _configuration = config;
        _emailService = emailService;
    }

    public class ResetPasswordDto
    {
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

    [HttpPost("register")]
    [EnableRateLimiting("AuthLimit")]
    public async Task<IActionResult> Register(RegisterDto request)
    {
        // 1. Email kullanımda mı kontrolü
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest("Bu email adresi zaten kullanımda.");
        }

        // 2. Şifreyi BCrypt ile güvenli hale getir
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 8);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = passwordHash // Asla düz şifre kaydetmiyoruz!
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Kayıt başarılı." });
    }

    [HttpPost("login")]
    [EnableRateLimiting("AuthLimit")]
    public async Task<IActionResult> Login(LoginDto request)
    {
        // 1. Kullanıcıyı bul
        var watch = System.Diagnostics.Stopwatch.StartNew();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        Console.WriteLine($"[1] Veritabanı arama süresi: {watch.ElapsedMilliseconds} ms");
        if (user == null)
        {
            return BadRequest("Hatalı e-posta veya şifre.");
        }

        // 2. Şifre eşleşiyor mu kontrol et
        watch.Restart();
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        Console.WriteLine($"[2] Şifre Süresi: {watch.ElapsedMilliseconds} ms");
        if (!isPasswordValid)
        {
            return BadRequest("Hatalı e-posta veya şifre.");
        }

        // 3. Şifre doğruysa Token (VIP Bileklik) üret
        watch.Restart();
        string token = CreateToken(user);
        Console.WriteLine($"[3] token süresi: {watch.ElapsedMilliseconds} ms");

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            SameSite = SameSiteMode.None,
            Secure = true
        };

        Response.Cookies.Append("jwt", token, cookieOptions);

        var response = new AuthResponseDto
        {
            //dto bozmamak için boş string yolluyoruz
            Token = "",
            UserId = user.Id,
            Username = user.Username
        };
        return Ok(response);
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("AuthLimit")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            // Güvenlik: kullanıcı var mı yok mu belli etme
            return Ok(new { Mesaj = "Eğer sistemde böyle bir e-posta varsa, sıfırlama bağlantısı gönderilmiştir." });
        }

        string resetToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        user.ResetPasswordToken = resetToken;
        user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(15);
        await _context.SaveChangesAsync();

        string resetLink = $"https://task-flow-denizk.vercel.app/reset-password?token={resetToken}";

        string mailBody = $@"
            <h3>TaskFlow Şifre Sıfırlama</h3>
            <p>Merhaba,</p>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
            <p><a href='{resetLink}' style='padding: 10px 15px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;'>Şifremi Sıfırla</a></p>
            <p>Bu bağlantı güvenlik sebebiyle <b>15 dakika</b> sonra geçersiz olacaktır.</p>
            <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>";

        await _emailService.SendEmailAsync(user.Email, "TaskFlow - Şifre Sıfırlama Talebi", mailBody);

        return Ok(new { Mesaj = "Eğer sistemde böyle bir e-posta varsa, sıfırlama bağlantısı gönderilmiştir." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
    {
        //veritabanında bu tokene sahip ve tokenin süresi geçmemiş kullanıcıyı arar
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.ResetPasswordToken == request.Token &&
            u.ResetPasswordTokenExpiry > DateTime.UtcNow);
        if (user == null)
        {
            return BadRequest("Geçersiz veya süresi dolmuş bir sıfırlama bağlantısı.");
        }

        //yeni şifreyi bcrypt ile şifreliyoruz
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 8);

        //güvenlik için kullanılmış tokeni ve süresini temizliyoruz
        user.ResetPasswordToken = null;
        user.ResetPasswordTokenExpiry = null;

        //veritabanına kaydet
        await _context.SaveChangesAsync();

        return Ok(new { Mesaj = "Şifreniz başarıyla güncellendi." });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("jwt");
        return Ok(new { Mesaj = "Başarıyla çıkış yapıldı" });
    }

    [HttpGet("ping")]
    public IActionResult Ping() { return Ok("Ayaktayım!"); }

    // Token üretme algoritması
    private string CreateToken(User user)
    {
        // Biletin içine yazacağımız bilgiler (Örn: Kullanıcının ID'si)
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("username", user.Username)
        };

        // appsettings.json'dan gizli anahtarı alıyoruz
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration.GetSection("JwtSettings:SecretKey").Value!));

        // Anahtarı mühürlüyoruz
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        // Biletin kurallarını (Kim üretti, ne zaman bitecek) belirliyoruz
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(int.Parse(_configuration.GetSection("JwtSettings:ExpiryMinutes").Value!)),
            Issuer = _configuration.GetSection("JwtSettings:Issuer").Value,
            Audience = _configuration.GetSection("JwtSettings:Audience").Value,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}