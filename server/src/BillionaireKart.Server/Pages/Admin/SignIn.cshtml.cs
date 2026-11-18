using System.Security.Claims;
using BillionaireKart.Server.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace BillionaireKart.Server.Pages.Admin;

public sealed class SignInModel(AdminAuth auth, ILogger<SignInModel> log) : PageModel
{
    public string? Error { get; private set; }

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync(string? token)
    {
        var address = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (!auth.TryCountAttempt(address))
        {
            Error = "Too many tries. Wait a few minutes and try again.";
            Response.StatusCode = StatusCodes.Status429TooManyRequests;
            return Page();
        }
        if (!auth.Check(token))
        {
            log.LogWarning("Admin sign-in failed from {Address}", address);
            Error = "That token is not right.";
            return Page();
        }
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "admin")], AdminAuth.Scheme);
        await HttpContext.SignInAsync(AdminAuth.Scheme, new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = true });
        log.LogInformation("Admin signed in from {Address}", address);
        return LocalRedirect("/admin");
    }
}
