# Alignment with current project / technology used

The primary goal of this feedback is to make sure the code is inline with project design principles and frameworks being used.

## Analyze other pieces of exisitng code

Make sure to analyze existing code (or rest of the code). Make sure you search for the components the new code connects with existing components.

What this helps you find is

1. Any duplicate code
2. Alignment of code wrt. new code (also design alignment).
  Examples: How IoC is used, how logging is injected, how construction / destruction patterns are applied etc.
3. How rest of the project uses external frameworks.

## Analyze documentation of external frameworks

Make web searches to undersatand how the framework is expected to be used. What are the design patterns around it.

IMPORTANT: Make sure you keep version into account.

What this helps you find is

1. Does developer understand how to use the external framework
  Example: How to use Orleans, what are the patterns there, how to initialize constructor vs. activation functions. How to integrate it with IoC etc.
2. How well the framework is used.
3. Along with above (existing code) analysis, you can now judge deviation from standard practices.

## Code Alignment Checklist

- [ ] Aligns with existing code / practices
- [ ] Aligns with frameworks being used
- [ ] No duplicated code
- [ ] Comments explain why, not what
