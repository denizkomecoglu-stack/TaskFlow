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

namespace TaskFlow.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    // IConfiguration ile appsettings.json'daki JwtSettings'i okuyabileceğiz
    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
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
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            return BadRequest("Kullanıcı bulunamadı.");
        }

        // 2. Şifre eşleşiyor mu kontrol et
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return BadRequest("Hatalı şifre.");
        }

        // 3. Şifre doğruysa Token (VIP Bileklik) üret
        string token = CreateToken(user);

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

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("jwt");
        return Ok(new { Mesaj = "Başarıyla çıkış yapıldı" });
    }

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