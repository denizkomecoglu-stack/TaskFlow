public class ActivityLog
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; } //hangi panoda oldu
    public Guid UserId { get; set; } //kim yaptı
    public string ActionType { get; set; } //aksiyon türü
    public string Entity { get; set; } //neyin üzerinde işlem yapıldı
    public string Message { get; set; } //kullanıcıya gösterilecek mesaj
    public DateTime CreatedAt { get; set; }
}