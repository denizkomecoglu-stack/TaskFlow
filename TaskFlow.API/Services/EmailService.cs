using System.Net;
using System.Net.Mail;

public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
{
    var smtpServer = _config["EmailSettings:SmtpServer"];
    var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"]);

    // YENİ: Brevo'nun SMTP giriş kullanıcı adını ayrı alıyoruz
    var smtpUsername = _config["EmailSettings:SmtpUsername"];

    // Asıl gönderici e-posta (Kendi kişisel adresin)
    var senderEmail = _config["EmailSettings:SenderEmail"];
    var senderPassword = _config["EmailSettings:SenderPassword"];
    var senderName = _config["EmailSettings:SenderName"];

    using var client = new SmtpClient(smtpServer, smtpPort)
    {
        // Giriş yaparken Brevo'nun verdiği o tuhaf adresi kullanıyoruz
        Credentials = new NetworkCredential(smtpUsername, senderPassword),
        EnableSsl = true,
        DeliveryMethod = SmtpDeliveryMethod.Network,
        UseDefaultCredentials = false,
        Timeout = 10000
    };

    using var mailMessage = new MailMessage
    {
        // Karşı tarafa mailin senin gerçek e-postandan gittiği görünecek
        From = new MailAddress(senderEmail.Trim(), senderName.Trim()),
        Subject = subject,
        Body = htmlMessage,
        IsBodyHtml = true
    };

    mailMessage.To.Add(toEmail);
    await client.SendMailAsync(mailMessage);
}