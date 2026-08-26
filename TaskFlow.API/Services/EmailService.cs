using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace TaskFlow.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            var smtpServer = _config["EmailSettings:SmtpServer"];
            var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"]!);

            // Brevo'nun SMTP giriş kullanıcı adı
            var smtpUsername = _config["EmailSettings:SmtpUsername"];

            // Asıl gönderici e-posta (Senin gerçek adresin)
            var senderEmail = _config["EmailSettings:SenderEmail"];
            var senderPassword = _config["EmailSettings:SenderPassword"];
            var senderName = _config["EmailSettings:SenderName"];

            using var client = new SmtpClient(smtpServer, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUsername, senderPassword),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Timeout = 10000
            };

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail!.Trim(), senderName!.Trim()),
                Subject = subject,
                Body = htmlMessage,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail);
            await client.SendMailAsync(mailMessage);
        }
    }
}