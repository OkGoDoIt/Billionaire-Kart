using BillionaireKart.Server.Rating;

namespace BillionaireKart.Tests;

/// <summary>Known answers from the reference library, openskill 5.0.1 for JavaScript, with its default options
/// (Plackett-Luce, mu 25, sigma 25/3, beta 25/6, kappa 0.0001, tau 25/300), each player a team of one.</summary>
public sealed class OpenSkillTests
{
    static void Check(Skill[] got, (double Mu, double Sigma)[] want)
    {
        Assert.Equal(want.Length, got.Length);
        for (int i = 0; i < want.Length; i++)
        {
            Assert.Equal(want[i].Mu, got[i].Mu, 8);
            Assert.Equal(want[i].Sigma, got[i].Sigma, 8);
        }
    }

    [Fact]
    public void Matches_the_reference_library()
    {
        Check(OpenSkill.Rate([new(25, 25.0 / 3), new(25, 25.0 / 3)]),
            [(27.6353894931, 8.0659014135), (22.3646105069, 8.0659014135)]);

        Check(OpenSkill.Rate([new(30, 4), new(25, 25.0 / 3), new(22, 1.5), new(28, 6)]),
            [(30.7833013587, 3.9904729570), (27.2414678988, 7.9720627690), (22.0262902224, 1.5017619732), (24.6564816656, 5.8339810713)]);

        Check(OpenSkill.Rate([new(18, 1.5), new(22, 1.5), new(26, 1.5), new(25, 25.0 / 3), new(31, 3), new(20, 7), new(26, 1.5), new(24, 5)]),
            [(18.1189785034, 1.5022744445), (22.1005620081, 1.5022143243), (26.0707042206, 1.5021237713), (26.5027867793, 8.0869060457),
             (30.8842102772, 2.9940758251), (20.2249081500, 6.8234611220), (25.8919121123, 1.5017134524), (21.6473174962, 4.9311111248)]);

        // Ties (rank [1, 1, 2]).
        Check(OpenSkill.Rate([new(25, 25.0 / 3), new(25, 25.0 / 3), new(25, 25.0 / 3)], [1, 1, 2]),
            [(25.7172621702, 8.2052433774), (25.7172621702, 8.2052433774), (23.5654756596, 8.2052433774)]);
    }
}
