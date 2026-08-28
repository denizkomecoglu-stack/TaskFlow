using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskFlow.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryToColumnss : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "Columns",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Columns");
        }
    }
}
