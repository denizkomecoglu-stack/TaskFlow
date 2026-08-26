using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace TaskFlow.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var smtpServer = _config["EmailSettings:SmtpServer"];
            var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"]);
            var senderEmail = _config["EmailSettings:SenderEmail"];
            var senderPassword = _config["EmailSettings:SenderPassword"];
            var senderName = _config["EmailSettings:SenderName"];

            using var client = new SmtpClient(smtpServer, smtpPort);

            // 1. Sıralama çok önemli: Önce false diyoruz
            client.UseDefaultCredentials = false;

            // 2. Sonra şifremizi veriyoruz
            client.Credentials = new NetworkCredential(senderEmail, senderPassword);

            // 3. Güvenliği açıyoruz
            client.EnableSsl = true;

            // --- YANLIŞLIKLA SİLİNEN KISIM BURASIYDI ---
            // 4. Mektubu hazırlıyoruz
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true // Linkin tıklanabilir olması (HTML) için
            };

            mailMessage.To.Add(toEmail);

            // 5. Ve POSTALIYORUZ!
            await client.SendMailAsync(mailMessage);
        }
    }
}