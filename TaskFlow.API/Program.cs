using Microsoft.EntityFrameworkCore;
using TaskFlow.API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı Ayarı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. JWT Ayarları
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddAuthentication(options =>
{
    //sistemin varsayılan doğrulama yöntemi jwt olacak.
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, // bu kartı biz mi ürettik
        ValidateAudience = true, //bu kart bizim sistem için mi
        ValidateLifetime = true, // son kullanma tarihi geçmiş mi
        ValidateIssuerSigningKey = true, //şifreleme imzası doğrumu
        ValidIssuer = jwtSettings["Issuer"], //beklenen üretici kim
        ValidAudience = jwtSettings["Audience"], //beklenen alıcı kim
        //bayt dizisine çevirip şifre anahtarı olarak veriyoruz
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var token = context.Request.Cookies["jwt"];
            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        // YENİ: Vercel'in sürekli değişen linkleriyle uğraşmamak için dinamik izin veriyoruz!
        policy.SetIsOriginAllowed(origin =>
                  origin == "http://localhost:5173" || // Localhost'a izin ver
                  origin.EndsWith(".vercel.app")       // Sonu .vercel.app ile bitenlere izin ver
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("AuthLimit", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5; //maksimum 5 deneme
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0; //kuyruğa alma direkt reddet
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddOpenApi(); // .NET 10'un kendi temiz OpenAPI sistemi

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); //geliştirme aşamasındayken api dokümanı yayınla
}



// 2. İsteklerin nereye gideceğini (Rotaları) belirle
app.UseRouting();

// 3. KAPIYI AÇ (CORS her şeyden önce gelmeli ki, dönen hatalar React'e ulaşabilsin!)
app.UseCors("ReactApp");

// 4. Hız Sınırlandırıcısı (CORS'tan geçtiyse artık hızını kontrol edebiliriz)
app.UseRateLimiter();

// 5. Kimlik ve Yetki Kontrolleri
app.UseAuthentication();
app.UseAuthorization();

// 6. İlgili Controller'lara ve Hub'lara Dağıt
app.MapControllers();
app.MapHub<TaskFlow.API.Hubs.BoardHub>("/hubs/board"); // DİKKAT: React tarafında burayı '/hubs/board' olarak yazmıştık!

app.Run();