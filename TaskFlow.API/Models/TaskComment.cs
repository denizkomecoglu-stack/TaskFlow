using TaskFlow.API.Models;

public class TaskComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TaskId { get; set; }
    public TaskItem Task { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}