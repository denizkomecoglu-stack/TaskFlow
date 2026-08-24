namespace TaskFlow.API.DTOs
{
    public class UpdateColumnPositionDto
    {
        public Guid ColumnId { get; set; }
        public double NewPosition { get; set; }
    }
}
