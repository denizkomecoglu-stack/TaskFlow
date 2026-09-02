namespace TaskFlow.API.Models
{
    public class TaskItem
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public double Position { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? DueDate { get; set; }

        //Hangi sütunda?
        public Guid ColumnId { get; set; }
        public Column Column { get; set; } = null!;
        //Kime atandı? atanmamış da olabilir o yüzden nullable
        public Guid? AssigneeId { get; set; }
        public User? Assignee { get; set; }
        public ICollection<TaskAssignee> Assignees { get; set; } = new List<TaskAssignee>();
        public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();

    }
}
