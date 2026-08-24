using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.API.Data;
using TaskFlow.API.Models;

namespace TaskFlow.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        public UsersController(AppDbContext context) { _context = context; }

        //Test amaçlı kullanıcı oluşturuyoruz
        [HttpPost("create-test-user")]
        public async Task<IActionResult> CreateTestUser()
        {
            var testUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "deniz_test",
                Email = "test@test123.com",
                PasswordHash = "123"
            };

            _context.Users.Add(testUser);
            await _context.SaveChangesAsync();

            return Ok(new { Mesaj = "Kullanıcı oluşturuldu. Bu ID'yi kopyala:", UserId = testUser.Id });
        }
    }
}