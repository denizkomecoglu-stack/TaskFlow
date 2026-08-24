using System.Collections;

namespace TaskFlow.API.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        //İlişkiler bir kullanıcının birden çok panosu ve atanmış görevi olabilir
        public ICollection<TaskItem> AssignedTasks { get; set; } = new List<TaskItem>();
        public ICollection<Board> OwnedBoards { get; set; } = new List<Board>();

    }
}
