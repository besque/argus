# utils/markov.py
from collections import defaultdict, Counter
import math
import joblib

class SimpleMarkov:
    """
    A simple first-order Markov chain:
        P(next | current) = count(current→next) / total(current)
    """

    def __init__(self):
        self.trans_counts = defaultdict(Counter)
        self.total_counts = Counter()

    def fit_from_sequences(self, sequences):
        """
        sequences: list of token lists
        """
        for seq in sequences:
            for a, b in zip(seq, seq[1:]):
                self.trans_counts[a][b] += 1
                self.total_counts[a] += 1

    def transition_probability(self, a, b):
        """
        Returns probability of transition a→b.
        Defaults to small epsilon if unseen.
        """
        total = self.total_counts.get(a, 0)
        if total == 0:
            return 1e-6
        count = self.trans_counts[a].get(b, 0)
        if count == 0:
            return 1e-6
        return count / total

    def prob_sequence(self, tokens):
        """
        Given a sequence of tokens from the backend,
        compute anomaly score = 1 - geometric mean of transition probabilities.
        """
        if len(tokens) < 2:
            return 0.0

        probs = []
        for a, b in zip(tokens, tokens[1:]):
            p = self.transition_probability(a.strip(), b.strip())
            probs.append(p)

        if len(probs) == 0:
            return 0.0

        # geometric mean of probs
        log_sum = sum(math.log(p) for p in probs)
        mean_p = math.exp(log_sum / len(probs))

        # convert to anomaly score → higher = more abnormal
        return 1.0 - mean_p
