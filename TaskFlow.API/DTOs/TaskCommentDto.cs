using TaskFlow.API.DTOs;

public class TaskCommentDto
{
    public Guid Id { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; }
    public MemberDto User { get; set; } //yorunu yapan kişinin bilgilerini içeren DTO
}