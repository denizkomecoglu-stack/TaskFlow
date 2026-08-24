using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TaskFlow.API.Data;

namespace TaskFlow.API.Hubs
{
    [Authorize] // GÜVENLİK 1: Sadece token'ı olan (giriş yapmış) kişiler istasyona girebilir
    public class BoardHub : Hub
    {
        private readonly AppDbContext _context;

        // Veritabanı bağlantımızı Hub'ın içine alıyoruz
        public BoardHub(AppDbContext context)
        {
            _context = context;
        }

        public async Task JoinBoardGroup(string boardId)
        {
            // Bağlanan kişinin JWT token'ından ID'sini yakalıyoruz
            var userIdString = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId) || !Guid.TryParse(boardId, out var parsedBoardId))
            {
                return; // Geçersiz bilgiyle gelenleri sessizce geri çevir
            }

            // GÜVENLİK 2: Bu adam gerçekten bu panonun Sahibi veya Üyesi mi?
            var hasAccess = await _context.Boards
                .AnyAsync(b => b.Id == parsedBoardId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)));

            if (hasAccess)
            {
                // Yetkisi varsa odanın kapısını aç
                await Groups.AddToGroupAsync(Context.ConnectionId, boardId);
            }
            else
            {
                // Yetkisi yoksa doğrudan bağlantıyı reddet
                throw new HubException("Bu panonun canlı yayınına katılma yetkiniz yok!");
            }
        }

        public async Task LeaveBoardGroup(string boardId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);
        }
    }
}