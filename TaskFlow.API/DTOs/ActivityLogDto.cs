namespace TaskFlow.API.DTOs
{
    public class ActivityLogDto
    {
        public Guid Id { get; set; }
        public string ActionType { get; set; }
        public string Entity { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}