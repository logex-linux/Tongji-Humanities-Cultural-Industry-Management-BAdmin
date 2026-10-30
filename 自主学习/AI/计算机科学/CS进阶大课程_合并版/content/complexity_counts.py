"""Count executed operations; no fabricated wall-clock measurements. Python 3.9+."""


def linear(n):
    steps = 0
    for _ in range(n):
        steps += 1
    return steps


def quadratic(n):
    steps = 0
    for _ in range(n):
        for _ in range(n):
            steps += 1
    return steps


def dependent(n):
    steps = 0
    for i in range(1, n + 1):
        j = i
        while j <= n:
            steps += 1
            j *= 2
    return steps


def main():
    print('n linear quadratic dependent')
    for n in (128, 256, 512):
        values = linear(n), quadratic(n), dependent(n)
        assert values == (n, n * n, 2 * n - 1)
        print(n, *values)
    assert dependent(0) == 0
    for n in range(1, 257):
        expected, divisor = 0, 1
        while divisor <= n:
            expected += n // divisor
            divisor *= 2
        assert dependent(n) == expected
        assert n <= expected < 2 * n


if __name__ == '__main__':
    main()
