# Flask backend providing financial calculation endpoints:
#   /add          - simple addition
#   /blackscholes - Black-Scholes option pricing with Greeks
#   /montecarlo   - Monte Carlo stock price simulation
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from scipy.stats import norm  # Used for the normal distribution CDF/PDF in Black-Scholes

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the frontend


@app.route('/add', methods=['POST'])
def add():
    """Return the sum of two numbers provided in the JSON body as 'a' and 'b'."""
    data = request.get_json()
    a = data.get('a', 0)  # Default to 0 if not provided
    b = data.get('b', 0)
    return jsonify({'result': a + b})


@app.route('/blackscholes', methods=['POST'])
def blackscholes():
    """
    Price a European call or put option using the Black-Scholes model and
    return the option price along with all five Greeks.

    Expected JSON fields:
        S     - current stock price
        K     - option strike price
        T     - time to expiration in years
        r     - annual risk-free interest rate (as a percentage, e.g. 5 for 5%)
        sigma - annual volatility (as a percentage, e.g. 20 for 20%)
        option_type - 'call' (default) or 'put'
    """
    data = request.get_json()

    # Parse inputs; r and sigma arrive as percentages so divide by 100
    S = float(data['S'])           # Current stock price
    K = float(data['K'])           # Strike price
    T = float(data['T'])           # Time to expiration (years)
    r = float(data['r']) / 100     # Risk-free rate (decimal)
    sigma = float(data['sigma']) / 100  # Volatility (decimal)
    option_type = data.get('option_type', 'call')

    # All four inputs must be strictly positive for the model to be valid
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return jsonify({'error': 'All inputs must be positive'}), 400

    # --- Black-Scholes intermediate terms ---
    # d1 and d2 are standardised distances used throughout the pricing formula
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    # --- Greeks shared by both call and put ---
    # Gamma: rate of change of delta with respect to the stock price
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    # Vega: sensitivity of the option price to a 1% change in volatility
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100

    if option_type == 'call':
        # Black-Scholes call price: S*N(d1) - K*e^(-rT)*N(d2)
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        # Delta: probability-weighted sensitivity to the stock price (0 to 1 for calls)
        delta = norm.cdf(d1)
        # Theta: time decay per calendar day (divided by 365)
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365
        # Rho: sensitivity to a 1% change in the risk-free rate
        rho = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
    else:
        # Black-Scholes put price: K*e^(-rT)*N(-d2) - S*N(-d1)
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        # Delta for puts is negative (-1 to 0)
        delta = norm.cdf(d1) - 1
        # Theta for puts (positive carry term because puts gain from discounting)
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365
        # Rho for puts is negative (puts lose value when rates rise)
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100

    return jsonify({
        'price': round(float(price), 4),
        'delta': round(float(delta), 4),
        'gamma': round(float(gamma), 6),
        'theta': round(float(theta), 4),
        'vega': round(float(vega), 4),
        'rho': round(float(rho), 4),
    })


@app.route('/montecarlo', methods=['POST'])
def montecarlo():
    """
    Simulate future stock price paths using Geometric Brownian Motion (GBM)
    and return summary statistics plus sampled paths for charting.

    Expected JSON fields (all optional, defaults shown):
        S0      - initial stock price (100)
        mu      - expected annual return as a percentage (10)
        sigma   - annual volatility as a percentage (20)
        T       - time horizon in years (1)
        steps   - number of time steps, e.g. 252 for daily (252)
        n_paths - number of simulated paths, capped at 5000 (1000)
    """
    data = request.get_json()

    # Parse inputs; mu and sigma arrive as percentages so divide by 100
    S0 = float(data.get('S0', 100))
    mu = float(data.get('mu', 10)) / 100          # Expected return (decimal)
    sigma = float(data.get('sigma', 20)) / 100    # Volatility (decimal)
    T = float(data.get('T', 1))                   # Time horizon (years)
    steps = int(data.get('steps', 252))            # Number of time steps
    n_paths = min(int(data.get('n_paths', 1000)), 5000)  # Cap paths to avoid memory issues

    # Size of each time step
    dt = T / steps

    # Draw all random shocks at once for efficiency: shape (n_paths, steps)
    Z = np.random.standard_normal((n_paths, steps))

    # Initialise price matrix; first column is the starting price S0
    paths = np.zeros((n_paths, steps + 1))
    paths[:, 0] = S0

    # Simulate each time step using the GBM log-normal update formula:
    #   S(t) = S(t-1) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
    for t in range(1, steps + 1):
        paths[:, t] = paths[:, t - 1] * np.exp(
            (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z[:, t - 1]
        )

    # Final prices across all paths (used for summary statistics)
    final_prices = paths[:, -1]

    # Aggregate statistics across all paths at each time step
    mean_path = np.mean(paths, axis=0)
    perc_5 = np.percentile(paths, 5, axis=0)    # Lower confidence band
    perc_95 = np.percentile(paths, 95, axis=0)  # Upper confidence band

    # Sample down to max 200 time points for display
    display_steps = min(steps, 200)
    indices = np.linspace(0, steps, display_steps + 1, dtype=int)
    display_paths_count = min(50, n_paths)  # Send at most 50 individual paths to the frontend

    return jsonify({
        'paths': paths[:display_paths_count][:, indices].tolist(),
        'mean_path': mean_path[indices].tolist(),
        'perc_5': perc_5[indices].tolist(),
        'perc_95': perc_95[indices].tolist(),
        'time_points': (indices * T / steps).tolist(),  # Actual time values for the x-axis
        'stats': {
            'mean_final': round(float(np.mean(final_prices)), 2),
            'std_final': round(float(np.std(final_prices)), 2),
            'perc_5': round(float(np.percentile(final_prices, 5)), 2),
            'perc_95': round(float(np.percentile(final_prices, 95)), 2),
            # Percentage of paths that finished above the starting price
            'prob_gain': round(float(np.mean(final_prices > S0) * 100), 1),
        }
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
