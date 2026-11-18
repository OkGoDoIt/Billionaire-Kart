using BillionaireKart.Server.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class SignOutModel : PageModel
{
    public IActionResult OnGet() => LocalRedirect("/admin");

    public async Task<IActionResult> OnPostAsync()
    {
        await HttpContext.SignOutAsync(AdminAuth.Scheme);
        return LocalRedirect("/admin/signin");
    }
}
