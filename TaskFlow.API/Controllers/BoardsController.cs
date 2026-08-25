using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using TaskFlow.API.Data;
using TaskFlow.API.DTOs;
using TaskFlow.API.Hubs;
using TaskFlow.API.Models;

namespace TaskFlow.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Güvenlik: Tüm Controller giriş yapmayı zorunlu kılar
    public class BoardsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<BoardHub> _hubContext;

        public BoardsController(AppDbContext context, IHubContext<BoardHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // GET: api/boards/{id}
        // TEK BİR PANOYU DETAYLARIYLA GETİRİR (İçeri girmek için)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBoard(Guid id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdString == null) return Unauthorized("Kullanıcı kimliği doğrulanamadı.");

            var userId = Guid.Parse(userIdString);

            // DÜZELTME: Sahibi VEYA Üyesi olduğu panoya girebilsin!
            var board = await _context.Boards
                .Include(b => b.Columns.OrderBy(c => c.Position))
                .ThenInclude(c => c.Tasks.OrderBy(t => t.Position))
                .FirstOrDefaultAsync(b => b.Id == id && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (board == null) return NotFound("Pano bulunamadı veya yetkiniz yok.");

            var boardDto = new BoardDtos
            {
                Id = board.Id,
                Title = board.Title,
                CreatedAt = board.CreatedAt,
                IsOwner = board.OwnerId == userId,
                Columns = board.Columns.Select(c => new ColumnDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Position = c.Position,
                    BoardId = c.BoardId,
                    Tasks = c.Tasks.Select(t => new TaskItemDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Description = t.Description,
                        Position = t.Position,
                        ColumnId = t.ColumnId,
                        AssigneeId = t.AssigneeId
                    }).ToList()
                }).ToList()
            };

            return Ok(boardDto);
        }

        // GET: api/boards
        // DASHBOARD İÇİN PANOLARI LİSTELER
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BoardDtos>>> GetBoards()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdString == null) return Unauthorized("Kullanıcı Kimliği Doğrulanamadı.");

            var userId = Guid.Parse(userIdString);

            // DÜZELTME 1: Erken return kaldırıldı ve parantez hatası çözüldü. Önce veriyi çekiyoruz!
            var boards = await _context.Boards
                .Where(b => b.OwnerId == userId || b.Members.Any(m => m.UserId == userId))
                .Include(b => b.Columns)
                    .ThenInclude(c => c.Tasks)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            // DÜZELTME 2: Çekilen veriyi DTO'ya haritalıyoruz
            var boardList = boards.Select(b => new BoardDtos
            {
                Id = b.Id,
                Title = b.Title,
                CreatedAt = b.CreatedAt,
                IsOwner = b.OwnerId == userId,
                Columns = b.Columns
                    .OrderBy(c => c.Position)
                    .Select(c => new ColumnDto
                    {
                        Id = c.Id,
                        Title = c.Title,
                        Position = c.Position,
                        BoardId = c.BoardId,
                        Tasks = c.Tasks
                            .OrderBy(t => t.Position)
                            .Select(t => new TaskItemDto
                            {
                                Id = t.Id,
                                Title = t.Title,
                                Description = t.Description,
                                Position = t.Position,
                                ColumnId = t.ColumnId,
                                AssigneeId = t.AssigneeId
                            }).ToList()
                    }).ToList()
            }).ToList();

            // DÜZELTME 3: DTO listesini return ile yolluyoruz (Böylece altı sönük kalmıyor)
            return Ok(boardList);
        }

        // POST: api/boards
        [HttpPost]
        public async Task<ActionResult<BoardDtos>> CreateBoard(CreateBoardDto createDto)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            {
                return Unauthorized("Gecerli bir kullanıcı kimliği bulunamadı");
            }

            var newBoard = new Board
            {
                Id = Guid.NewGuid(),
                Title = createDto.Title,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Boards.Add(newBoard);
            await _context.SaveChangesAsync();


            var boardDto = new BoardDtos
            {
                Id = newBoard.Id,
                Title = newBoard.Title,
                CreatedAt = newBoard.CreatedAt
            };

            return CreatedAtAction(nameof(GetBoard), new { id = boardDto.Id }, boardDto);
        }

        // PUT: api/boards/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBoard(Guid id, [FromBody] UpdateBoardDto dto)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            // Sadece Panonun Sahibi adını değiştirebilsin (Güvenlik)
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.Id == id && b.OwnerId == userId);
            if (board == null) return NotFound("Pano bulunamadı veya bu işlem için yetkiniz yok");

            board.Title = dto.Title;
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Biri";
            await _hubContext.Clients.Group(id.ToString()).SendAsync("BoardUpdated", username);

            return Ok(new { Mesaj = "Pano adı başarıyla güncellendi." });
        }

        // DELETE: api/boards/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBoard(Guid id)
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            // Sadece Panonun Sahibi panoyu silebilir (Güvenlik)
            var board = await _context.Boards.FirstOrDefaultAsync(b => b.Id == id && b.OwnerId == userId);
            if (board == null) return NotFound("Pano bulunamadı veya bu işlem için yetkiniz yok.");

            _context.Boards.Remove(board);
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Pano Sahibi";
            await _hubContext.Clients.Group(id.ToString()).SendAsync("BoardDeleted", username);

            return Ok(new { Mesaj = "Pano içindeki tüm veriler başarıyla silindi." });
        }

        [HttpPost("{id}/leave")]
        public async Task<IActionResult> LeaveBoard(Guid id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { Mesaj = "Lütfen önce sisteme giriş yapın." });

            var userId = Guid.Parse(userIdString);

            //kullanıcı panonun üyesi mi diye bakıyoruz
            var boardMember = await _context.BoardMembers
                .FirstOrDefaultAsync(bm => bm.BoardId == id && bm.UserId == userId);

            if (boardMember == null)
                return BadRequest(new { Mesaj = "Zaten bu panonun üyesi değilsiniz (veya pano sahibi olabilirsiniz)" });

            _context.BoardMembers.Remove(boardMember);
            await _context.SaveChangesAsync();

            var username = User.FindFirstValue("username") ?? "Birisi";
            await _hubContext.Clients.Group(id.ToString()).SendAsync("UserLeft", username);

            return Ok(new { Mesaj = "Panodan ayrıldınız." });
        }

        // POST: api/boards/{id}/join
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinBoard(Guid id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized(new { Mesaj = "Lütfen önce sisteme giriş yapın." });

            var userId = Guid.Parse(userIdString);

            var board = await _context.Boards.FindAsync(id);
            if (board == null)
                return NotFound(new { Mesaj = "Böyle bir pano bulunamadı veya silinmiş." });

            if (board.OwnerId == userId)
                return BadRequest(new { Mesaj = "Zaten kendi panonuzdasınız." });

            var isAlreadyMember = await _context.BoardMembers
                .AnyAsync(bm => bm.BoardId == id && bm.UserId == userId);

            if (isAlreadyMember)
                return BadRequest(new { Mesaj = "Bu panoya zaten üyesiniz." });

            var boardMember = new BoardMember
            {
                BoardId = id,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            };

            try
            {
                _context.BoardMembers.Add(boardMember);
                await _context.SaveChangesAsync();

                var newUsername = User.FindFirstValue("username") ?? "Yeni bir üye";
                await _hubContext.Clients.Group(id.ToString()).SendAsync("Userjoined", newUsername);
            }
            catch (DbUpdateException)
            {
                return Ok(new { Mesaj = "Panoya başarıyla katıldınız." });
            }

            return Ok(new { Mesaj = "Panoya başarıyla katıldınız." });
        }
    }
}