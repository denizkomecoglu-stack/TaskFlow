namespace TaskFlow.API.Models
{
    public class Column
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public double Position { get; set; } // Sürükle bırak için

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        //Dış anahtar hangi panoya ait
        public Guid BoardId { get; set; }
        public Board Board { get; set; } = null!;
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}
