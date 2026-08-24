namespace TaskFlow.API.DTOs
{
    public class ColumnDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public double Position { get; set; }
        public Guid BoardId { get; set; }
        public List<TaskItemDto> Tasks { get; set; } = new List<TaskItemDto>();
    }

    public class CreateColumnDto
    {
        public string Title { get; set; } = string.Empty;
        public double Position { get; set; }
        public Guid BoardId { get; set; } // Hangi panoya eklenecek
    }
}