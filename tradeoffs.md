# Engineering decisions

## A narrow deterministic engine instead of a fake tax advisor

Flat rates expose assumptions and keep every result inspectable. The engine avoids annual statutory rate tables because filing status, jurisdiction and deduction rules would create unjustified precision. ISO sales are rejected rather than treating spread as capital gains with the wrong basis. AMT adjustment is visible and explicitly excluded from modeled tax reserve.

## SQLite instead of cloud infrastructure as a prerequisite

One download should run without service accounts. SQLite gives real transactions, durability and ownership filters with a small operational surface. The downside is a single-process design and dependence on a durable volume. Use PostgreSQL when multiple replicas, worker processes or account-scale traffic justify it.

## Shared calculation code instead of duplicated formulas

UI previews and server results use the same typed engine. Server-side saves independently validate and compute, so a modified client cannot persist its own output. Unit tests assert external invariants and known fixtures, not just equality with another copy of the implementation.

## Bounded AI tool selection instead of arbitrary tool autonomy

An LLM proposes only a sale fraction and future share price. It receives no balances by default. The engine formats the answer. This reduces expressiveness but gives a clean guarantee that every displayed financial figure is derived from validated inputs. No need for generated chain-of-thought; the trace records tools, inputs, outputs, and elapsed time.

## A real demo session instead of pretending to ship production auth

A session isolates scenarios from other browsers. It is not a durable login identity. A user who clears cookies cannot recover prior plans. This boundary is stated in the product and README. Production auth belongs in a separate milestone with account migration and lifecycle tests.

## Honest metrics

The hero line is decorative, not a financial projection. Comparison bars visualize cash and stock, while labels include other investments. Horizon labels do not claim to compute growth or holding eligibility. Calculation trace steps have no invented model latency. Agent latency measures elapsed request processing only; token accounting and distributed tracing are future work.
