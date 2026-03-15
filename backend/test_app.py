# Tests for the Flask backend (app.py).
# Each test sends a real HTTP request to the app via a test client and checks
# that the response looks correct — status code, JSON keys, and meaningful values.
# Run with:  pytest test_app.py -v

import pytest
from app import app


# ---------------------------------------------------------------------------
# Shared test fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    # Put Flask into testing mode so it surfaces errors rather than hiding them,
    # then hand each test a lightweight HTTP client that talks directly to the app
    # without needing a running server.
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


# ---------------------------------------------------------------------------
# /add  — simple addition endpoint
# ---------------------------------------------------------------------------

def test_add_basic(client):
    # Happy path: two positive integers should be added correctly.
    res = client.post('/add', json={'a': 3, 'b': 4})
    assert res.status_code == 200
    assert res.get_json()['result'] == 7

def test_add_floats(client):
    # Floats should be supported, not just integers.
    res = client.post('/add', json={'a': 1.5, 'b': 2.5})
    assert res.get_json()['result'] == 4.0

def test_add_defaults(client):
    # When neither 'a' nor 'b' is supplied the endpoint should default both to
    # 0 and return 0 rather than crashing.
    res = client.post('/add', json={})
    assert res.get_json()['result'] == 0

def test_add_negative(client):
    # Negative numbers must be handled without errors.
    res = client.post('/add', json={'a': -5, 'b': 3})
    assert res.get_json()['result'] == -2


# ---------------------------------------------------------------------------
# /blackscholes  — Black-Scholes option pricing endpoint
# ---------------------------------------------------------------------------

# Reusable base payloads for a standard at-the-money 1-year option.
# Using a dictionary makes it easy to override individual fields in each test.
BS_CALL = {'S': 100, 'K': 100, 'T': 1, 'r': 5, 'sigma': 20, 'option_type': 'call'}
BS_PUT  = {**BS_CALL, 'option_type': 'put'}  # Same inputs, put instead of call

def test_blackscholes_call_returns_keys(client):
    # The response must include the option price and all five Greeks.
    # If any key is missing the frontend chart will break.
    res = client.post('/blackscholes', json=BS_CALL)
    assert res.status_code == 200
    data = res.get_json()
    for key in ('price', 'delta', 'gamma', 'theta', 'vega', 'rho'):
        assert key in data

def test_blackscholes_call_price_positive(client):
    # A call option always has positive value (the holder can choose not to exercise).
    res = client.post('/blackscholes', json=BS_CALL)
    assert res.get_json()['price'] > 0

def test_blackscholes_put_price_positive(client):
    # Same logic applies to puts — price must always be greater than zero.
    res = client.post('/blackscholes', json=BS_PUT)
    assert res.get_json()['price'] > 0

def test_blackscholes_call_delta_range(client):
    # Call delta is the probability (risk-neutral) that the option expires in the
    # money, so it must always be between 0 and 1.
    res = client.post('/blackscholes', json=BS_CALL)
    delta = res.get_json()['delta']
    assert 0 < delta < 1

def test_blackscholes_put_delta_range(client):
    # Put delta is negative (puts gain value when the stock falls), and must
    # always lie between -1 and 0.
    res = client.post('/blackscholes', json=BS_PUT)
    delta = res.get_json()['delta']
    assert -1 < delta < 0

def test_blackscholes_put_call_parity(client):
    # Put-call parity is a fundamental no-arbitrage relationship:
    #   C - P = S - K * e^(-rT)
    # If the model violates this, the pricing formulas are wrong.
    call = client.post('/blackscholes', json=BS_CALL).get_json()
    put  = client.post('/blackscholes', json=BS_PUT).get_json()
    import math
    parity = BS_CALL['S'] - BS_CALL['K'] * math.exp(-BS_CALL['r'] / 100 * BS_CALL['T'])
    # Allow a tiny rounding tolerance from the 4-decimal-place rounding in the response
    assert abs((call['price'] - put['price']) - parity) < 0.01

def test_blackscholes_invalid_zero_T(client):
    # T = 0 means the option has already expired — the model is undefined.
    # The endpoint should reject this with a 400 Bad Request.
    res = client.post('/blackscholes', json={**BS_CALL, 'T': 0})
    assert res.status_code == 400

def test_blackscholes_invalid_zero_sigma(client):
    # sigma = 0 (no volatility) causes a division-by-zero in the Black-Scholes
    # formula. The endpoint must catch this and return 400.
    res = client.post('/blackscholes', json={**BS_CALL, 'sigma': 0})
    assert res.status_code == 400

def test_blackscholes_invalid_negative_S(client):
    # A negative stock price is economically impossible.
    # The endpoint should reject it with a 400 rather than returning nonsense.
    res = client.post('/blackscholes', json={**BS_CALL, 'S': -10})
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# /montecarlo  — Monte Carlo stock price simulation endpoint
# ---------------------------------------------------------------------------

# Standard baseline parameters: $100 stock, 10% expected return, 20% volatility,
# 1-year horizon, 252 daily steps, 200 simulated paths.
MC_BASE = {'S0': 100, 'mu': 10, 'sigma': 20, 'T': 1, 'steps': 252, 'n_paths': 200}

def test_montecarlo_returns_keys(client):
    # The response must contain all six top-level keys the frontend expects:
    # the raw paths, summary curves, time axis, and the stats block.
    res = client.post('/montecarlo', json=MC_BASE)
    assert res.status_code == 200
    data = res.get_json()
    for key in ('paths', 'mean_path', 'perc_5', 'perc_95', 'time_points', 'stats'):
        assert key in data

def test_montecarlo_stats_keys(client):
    # The nested 'stats' object must contain all five summary statistics
    # used to populate the results panel in the UI.
    stats = client.post('/montecarlo', json=MC_BASE).get_json()['stats']
    for key in ('mean_final', 'std_final', 'perc_5', 'perc_95', 'prob_gain'):
        assert key in stats

def test_montecarlo_prob_gain_range(client):
    # prob_gain is a percentage (0–100). Values outside this range would indicate
    # a bug in the calculation (e.g. multiplying by 100 twice).
    stats = client.post('/montecarlo', json=MC_BASE).get_json()['stats']
    assert 0 <= stats['prob_gain'] <= 100

def test_montecarlo_paths_capped_at_50(client):
    # Even if many paths are simulated, the response should only include up to 50
    # individual paths to keep the payload small enough to chart in the browser.
    res = client.post('/montecarlo', json={**MC_BASE, 'n_paths': 200})
    paths = res.get_json()['paths']
    assert len(paths) <= 50

def test_montecarlo_n_paths_capped_at_5000(client):
    # Requesting more than 5000 paths should not crash the server — the backend
    # silently caps n_paths at 5000 to prevent excessive memory usage.
    res = client.post('/montecarlo', json={**MC_BASE, 'n_paths': 9999})
    assert res.status_code == 200

def test_montecarlo_time_points_start_and_end(client):
    # The time axis must start at t=0 (the present) and end exactly at T (the
    # chosen horizon). If either end is wrong the x-axis labels will be off.
    data = client.post('/montecarlo', json=MC_BASE).get_json()
    assert data['time_points'][0] == 0.0
    assert abs(data['time_points'][-1] - MC_BASE['T']) < 1e-9
