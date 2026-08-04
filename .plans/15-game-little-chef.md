# Little Chef’s Grand Kitchen

## Current direction

Little Chef is an open-ended recipe experiment rather than a tutorial. Every order is generated from one of three families from the first round: pizza, pancakes, or ice cream. The customer goal pictures the selected variation, while the child discovers transformations by trying cards at four large stations: PREP, OVEN, PAN, and FREEZER.

Ingredients and intermediate cards remain visible and reusable. Correct combinations transform into new cards; invalid actions leave the state unchanged and simply bounce back. There are no arrows, hints, timers, scores, or step instructions. A completed final card is dragged or tapped to Tilly’s goal.

Orders are deterministic for a seed and round. A three-round family bag guarantees pizza, pancakes, and ice cream once each, while toppings, fruits, syrups, flavours, vessels, and toppings vary. The current pass uses compact procedural pictograms for missing food art and preserves the kitchen background, Tilly, fullscreen control, responsive layout, and celebration.

## Recipe families

- Pizza: dough + tomato -> sauced base; add two requested toppings in either order; OVEN -> pizza.
- Pancakes: flour + milk -> batter; PAN -> stack; add requested fruit and syrup in either order -> pancakes.
- Ice cream: cream + flavour -> mix; FREEZER -> scoop; PREP combine vessel and topping in either order -> ice cream.

This is a mechanics pass. Future work can replace pictograms with dedicated generated food art and deepen station feedback without changing the pure rules or deterministic generator.
