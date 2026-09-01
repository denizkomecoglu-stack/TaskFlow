namespace TaskFlow.API.Models
{
    public class TaskAssignee
    {
        //görevin ID'si
        public Guid TaskId { get; set; }
        public TaskItem Task { get; set; }

        //kullanıcının ID'si
        public Guid UserId { get; set; }
        public User User { get; set; }

        //atanma tarihi
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}
