namespace TaskFlow.API.DTOs
    //React'a görevleri listeleyip gönderirken kullanaağımız yapı
{
    public class TaskItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public double Position { get; set; } //kartın sütun içerisindeki sırası
        public Guid ColumnId { get; set; }
        public Guid? AssigneeId { get; set; }
    }

    //Reacttan yeni görev eklenirken beklediğimiz yapı
    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public double Position { get; set; }
        public Guid ColumnId { get; set; } //Görev hangi sütuna eklenecek
    }

    public class UpdateTaskPositionDto
    {
        public Guid TaskId {  get; set; }
        public Guid NewColumnId { get; set; } //Kart aynı sütun içinde kalsa bile bu ID yi alacaz
        public double NewPosition { get; set; }
    }
}
