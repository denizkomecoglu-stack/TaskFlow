using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Hubs;
using TaskFlow.API.Models;

namespace TaskFlow.API.Controllers
{
    [Route("api/Columns")]
    [ApiController]
    [Authorize] // sadece giriş yapan kullanıcılar sütun ekleyebilir
    public class ColumnsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<BoardHub> _hubContext;

        public ColumnsController(AppDbContext context, IHubContext<BoardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost]
        public async Task<IActionResult> CreateColumn([FromBody] CreateColumnDto dto)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = Guid.Parse(userIdString);

            // GÜVENLİK 1: Kullanıcı panonun SAHİBİ veya ÜYESİ mi?
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == dto.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
            {
                return NotFound("Pano bulunamadı veya bu panoya liste ekleme yetkiniz yok.");
            }

            // DİKKAT: Eski kodundaki "if (board == null)" şartını sildik çünkü misafirleri engelliyordu!

            // Gelen DTo'yu gerçek veritabanı nesnesine dönüştürüyoruz
            var column = new Column
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Position = dto.Position, // react tarafından hesaplanıp örn 1024 gönderilecek
                BoardId = dto.BoardId,
                Category = (ColumnCategory)dto.Category,
                CreatedAt = DateTime.UtcNow


            };

            _context.Columns.Add(column);
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(dto.BoardId.ToString()).SendAsync("BoardUpdated", username);

            // Eklenen sütunu reactın anlayacağı dto formatında geri döndürüyoruz
            var resultDto = new ColumnDto
            {
                Id = column.Id,
                Title = column.Title,
                Position = column.Position,
                BoardId = column.BoardId,
                Category = (int)column.Category,
                Tasks = new List<TaskItemDto>()

            };

            return Ok(resultDto);
        }

        [HttpPut("update-position")]
        public async Task<IActionResult> UpdatePosition([FromBody] UpdateColumnPositionDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            // GÜVENLİK 2: Sürükle-bırak işlemini SADECE Pano sahibi VEYA Üyeleri yapabilir
            var column = await _context.Columns
                .Include(c => c.Board)
                .ThenInclude(b => b.Members)
                .FirstOrDefaultAsync(c => c.Id == dto.ColumnId);

            if (column == null) return NotFound("Sütun bulunamadı.");

            bool hasAccess = column.Board.OwnerId == userId || column.Board.Members.Any(m => m.UserId == userId);
            if (!hasAccess) return Forbid(); // Yetkisiz işlem engellendi

            // Sadece pozisyon değerini güncelliyoruz
            column.Position = dto.NewPosition;

            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Sütun konumu başarıyla güncellendi." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateColumn(Guid id, [FromBody] UpdateColumnTitleDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            //sütunu bul
            var column = await _context.Columns.FindAsync(id);
            if (column == null) return NotFound("Sütun bulunamadı.");

            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            column.Title = dto.Title;
            await _context.SaveChangesAsync();
            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Sütun başarıyla güncellendi." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteColumn(Guid id)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            //sütunu bul
            var column = await _context.Columns.FindAsync(id);
            if (column == null) return NotFound("Sütun bulunamadı");

            //manuel olarak panoyu bul ve sahibini kontrol et
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            var boardId = column.BoardId.ToString();

            _context.Columns.Remove(column);
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(boardId).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Sütun başarıyla silindi." });
        }
    }
}