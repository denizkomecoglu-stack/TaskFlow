using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR; // YENİ: SignalR eklendi
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Hubs; // YENİ: Hub kütüphanesi eklendi
using TaskFlow.API.Models;

namespace TaskFlow.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TaskController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<BoardHub> _hubContext; // YENİ: Merkez İstasyon Telsizi

    public class AssignUserDto
    {
            public Guid UserId { get; set; }
    }

        // Telsizimizi (hubContext) yapılandırıcıya ekledik
        public TaskController(AppDbContext context, IHubContext<BoardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // GET: Sütuna Göre Görevleri Getir
        [HttpGet("by-column/{columnId}")]
        public async Task<ActionResult<IEnumerable<TaskItemDto>>> GetTasksByColumn(Guid columnId)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var column = await _context.Columns.FindAsync(columnId);
            if (column == null) return NotFound();

            //kullanıcı bu panonun üyesi sahibi mi?
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess) return Forbid();
            
            var tasks = await _context.Tasks
                .Where(t => t.ColumnId == columnId)
                .OrderBy(t => t.Position) // Görevleri sürükle-bırak sırasına göre dizer
                .Select(t => new TaskItemDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Position = t.Position,
                    ColumnId = t.ColumnId,
                })
                .ToListAsync();
            return Ok(tasks);
        }

        // POST: Yeni Görev Oluştur
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            // Sütunun varlığını kontrol edelim
            var column = await _context.Columns.FindAsync(dto.ColumnId);
            if (column == null) return NotFound("Sütun bulunamadı");

            // GÜVENLİK: Pano sahibi VEYA üyesi ise tam yetkisi var!
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            var newTask = new TaskItem
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                Position = dto.Position,
                ColumnId = dto.ColumnId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(newTask);
            await _context.SaveChangesAsync();
            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            var taskDto = new TaskItemDto
            {
                Id = newTask.Id,
                Title = newTask.Title,
                Description = newTask.Description,
                Position = newTask.Position,
                ColumnId = newTask.ColumnId
            };

            return Ok(taskDto);
        }

        [HttpPost("{taskId}/assign")]
        public async Task<IActionResult> AssignUser(Guid taskId, [FromBody] AssignUserDto dto)
        {
            var task = await _context.Tasks.FindAsync(taskId);
            if (task == null) return NotFound("Görev bulunamadı.");

            //kullanıcı atanmış mı kontrolü
            var exist = await _context.TaskAssignees.AnyAsync(ta => ta.TaskId == taskId && ta.UserId == dto.UserId);
            if (exist) return BadRequest("Kullanıcı zaten atanmış.");

            var assignee = new TaskAssignee
            {
                TaskId = taskId,
                UserId = dto.UserId
            };
            _context.TaskAssignees.Add(assignee);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Kullanıcı başarıyla atandı." });
        }

        [HttpDelete("{taskId}/assign/{userId}")]
        public async Task<IActionResult> RemoveAssignee(Guid taskId, Guid userId)
        {
            var assignee = await _context.TaskAssignees.FirstOrDefaultAsync(ta => ta.TaskId == taskId && ta.UserId == userId);
            if (assignee == null) return NotFound("Kullanıcı görevden ayrılmadı.");

            _context.TaskAssignees.Remove(assignee);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Kullanıcı görevden çıkarıldı." });
        }

        // PUT: Görev Konumunu Güncelle (Sürükle - Bırak)
        [HttpPut("update-position")]
        public async Task<IActionResult> UpdatePosition(UpdateTaskPositionDto updateDto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            // Veritabanından o görevi bul
            var task = await _context.Tasks.FindAsync(updateDto.TaskId);
            if (task == null) return NotFound("Güncellemek istenen görev bulunamadı.");

            // Gelen columnıd gerçekten var mı kontrol et
            var column = await _context.Columns.FindAsync(updateDto.NewColumnId);
            if (column == null) return BadRequest("Hedef Sütun geçersiz");

            // GÜVENLİK: Pano sahibi VEYA üyesi ise taşıyabilir!
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            // Değerleri güncelle
            task.ColumnId = updateDto.NewColumnId;
            task.Position = updateDto.NewPosition;

            // Veritabanına kaydet
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            var logMessage = $"{username}, '{task.Title}' görevini yeni bir listeye taşıdı.";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            var activityLog = new ActivityLog
            {
                Id = Guid.NewGuid(),
                BoardId = column.BoardId,
                UserId = userId,
                ActionType = "Taşıdı",
                Entity = "Görev",
                Message = logMessage,
                CreatedAt = DateTime.UtcNow,
            };

            _context.ActivityLogs.Add(activityLog);
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Görev konumu başarıyla güncellendi." });
        }

        // PUT: Görev Detayını Güncelle
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(Guid id, [FromBody] TaskItemDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound("Görev bulunamadı.");

            var column = await _context.Columns.FindAsync(task.ColumnId);
            if (column == null) return NotFound();

            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            task.Title = dto.Title;
            task.Description = dto.Description;
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Görev başarıyla güncellendi." });
        }

        // DELETE: Kartı Silme
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound("Görev bulunamadı.");

            var column = await _context.Columns.FindAsync(task.ColumnId);
            if (column == null) return NotFound();

            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == column.BoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (!hasAccess)
                return Unauthorized(new { Mesaj = "Bu işlemi yapmak için panoya üye olmalısınız." });

            var boardId = column.BoardId.ToString();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(column.BoardId.ToString()).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Görev başarıyla silindi." });
        }
    }
} 