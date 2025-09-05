from tommyapps.tommyjumper.models import InMemoryScoreCache


def test_add_and_count_scores():
    cache = InMemoryScoreCache(max_entries=5)
    assert cache.get_score_count() == 0

    cache.add_score('Ayo', 100, 2, 33)
    cache.add_score('Tomi', 80, 1, 22)
    assert cache.get_score_count() == 2


def test_top_scores_sorted_desc():
    cache = InMemoryScoreCache(max_entries=10)
    cache.add_score('A', 10, 1, 10)
    cache.add_score('B', 50, 2, 20)
    cache.add_score('C', 30, 2, 25)

    top = cache.get_top_scores(3)
    scores = [s['score'] for s in top]
    assert scores == [50, 30, 10]


def test_capacity_fifo_eviction():
    cache = InMemoryScoreCache(max_entries=2)
    cache.add_score('A', 10, 1, 10)
    cache.add_score('B', 20, 2, 20)
    cache.add_score('C', 30, 3, 30)

    # Oldest entry should be evicted (A)
    top = cache.get_top_scores(10)
    names = [s['player_name'] for s in top]
    assert 'A' not in names
    assert set(names) == {'B', 'C'}


