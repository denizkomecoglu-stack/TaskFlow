using System.Collections;

namespace TaskFlow.API.Models
{
    public class Board
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        //Dış anahtar panonun sahibi kim
        public Guid OwnerId { get; set; }
        public User Owner { get; set; } = null!;
        //İlişki: Bir panoda birden fazla sütun olur
        public ICollection<Column> Columns { get; set; } = new List<Column>();

        public ICollection<BoardMember> Members { get; set; } = new List<BoardMember>();
    }
}
