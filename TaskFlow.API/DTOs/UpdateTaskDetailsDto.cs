namespace TaskFlow.API.DTOs
{
    public class UpdateTaskDetailsDto
    {
        public string Title { get; set; }
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }
    }
}