namespace TaskFlow.API.DTOs
{
    public class MemberDto
    {
        public string Id { get; set; }
        public string Username { get; set; }

    }

    public class TaskAssigneeDto
    {
        public string UserId { get; set; }
        public MemberDto User { get; set; }
    } 
}
