

namespace TaskFlow.API.DTOs
{
   //React'a panoları listelerken göndereecğimiz güvenli veri yapısı
    public class BoardDtos
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsOwner { get; set; }

        public List<ColumnDto> Columns { get; set; } = new List<ColumnDto>();
    }
    //Reactten yeni pano oluştururken bize gelcek veri yapısı
    public class CreateBoardDto
    {
        public string Title { get; set; } = string.Empty;
        public Guid OwnerId { get; set; }
    }
}
