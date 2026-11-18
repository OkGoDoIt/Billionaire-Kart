namespace BillionaireKart.Server.Rating;

public readonly record struct Skill(double Mu, double Sigma)
{
    public double Ordinal => Mu - 3 * Sigma;
}

/// <summary>
/// OpenSkill's Plackett-Luce update for a free-for-all where every kart is a team of one,
/// with the reference library's defaults (openskill.js 5: mu 25, sigma 25/3, beta 25/6, kappa 0.0001, tau 25/300).
/// Checked against that library in the tests.
/// </summary>
public static class OpenSkill
{
    public const double Mu = 25.0;
    public const double Sigma = 25.0 / 3;
    public const double Beta = 25.0 / 6;
    public const double Kappa = 0.0001;
    public const double Tau = 25.0 / 300;

    /// <summary>New skills, in the order given. <paramref name="ranks"/> are finishing places (lower is better, ties allowed); null means the order given.</summary>
    public static Skill[] Rate(IReadOnlyList<Skill> players, IReadOnlyList<int>? ranks = null)
    {
        int n = players.Count;
        if (ranks != null && ranks.Count != n) throw new ArgumentException("One rank per player.", nameof(ranks));
        if (n < 2) return players.ToArray();

        // Tau keeps sigma from shrinking to nothing: add it before the update.
        var inflated = players.Select(p => new Skill(p.Mu, Math.Sqrt(p.Sigma * p.Sigma + Tau * Tau))).ToArray();
        var given = ranks?.ToArray() ?? Enumerable.Range(1, n).ToArray();

        // Work in finishing order (stable), as the reference does.
        var order = Enumerable.Range(0, n).OrderBy(i => given[i]).ToArray();
        var sortedRank = order.Select(i => given[i]).ToArray();

        // Tied places share the index of the first of them.
        var rank = new int[n];
        for (int j = 0, s = 0; j < n; j++)
        {
            if (j > 0 && sortedRank[j - 1] < sortedRank[j]) s = j;
            rank[j] = s;
        }

        var mu = order.Select(i => inflated[i].Mu).ToArray();
        var sigSq = order.Select(i => inflated[i].Sigma * inflated[i].Sigma).ToArray();

        double c = Math.Sqrt(sigSq.Sum() + n * Beta * Beta);
        var expMu = mu.Select(m => Math.Exp(m / c)).ToArray();

        var sumQ = new double[n];
        var a = new int[n];
        for (int q = 0; q < n; q++)
        {
            for (int i = 0; i < n; i++)
            {
                if (rank[i] >= rank[q]) sumQ[q] += expMu[i];
                if (rank[i] == rank[q]) a[q]++;
            }
        }

        var result = new Skill[n];
        for (int i = 0; i < n; i++)
        {
            double omega = 0, delta = 0;
            for (int q = 0; q < n; q++)
            {
                if (rank[q] > rank[i]) continue;
                double quotient = expMu[i] / sumQ[q];
                omega += (i == q ? 1 - quotient : -quotient) / a[q];
                delta += quotient * (1 - quotient) / a[q];
            }
            double gamma = Math.Sqrt(sigSq[i]) / c;
            double iOmega = omega * (sigSq[i] / c);
            double iDelta = delta * (sigSq[i] / (c * c)) * gamma;
            double sigma = Math.Sqrt(sigSq[i]);
            // Team of one: the player's share of the team variance is 1.
            result[order[i]] = new Skill(mu[i] + iOmega, sigma * Math.Sqrt(Math.Max(1 - iDelta, Kappa)));
        }
        return result;
    }
}
