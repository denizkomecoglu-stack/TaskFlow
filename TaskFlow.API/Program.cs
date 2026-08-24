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
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "https://task-flow-2rpcqdmi9-denizk.vercel.app/")
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

app.UseHttpsRedirection(); //http ile gelen istekleri httpsye yönlendir
app.UseRateLimiter();
app.UseCors("ReactApp"); // 1. kapıdan giren reactmı kontrol et

app.UseAuthentication(); // kimlik kontrolü kullanıcı giriş yapmış mı
app.UseAuthorization(); // yetki kontrolü

app.MapControllers(); //her şey doğru ise isteği ilgili controllera yönlendir
app.MapHub<TaskFlow.API.Hubs.BoardHub>("/boardHub");
app.Run();