# Making verification simple through lemmas

Reto Weber<sup>1</sup>

<sup>1</sup>Constructor Institute of Technology

## Abstract

Static verification relies on powerful tools to prove that the implementation complies with
the specification. In an ideal world we would have to just write pre- and postconditions and class
invariants and the tools would do the rest. However, in practice, we have to help the tool by providing
additional information. Especially for loops we have to provide non-trivial contracts such as a variant and
loop invariants. To automatically generate these contracts and rendering them superfluous was explored in
the past even if not succesful. The current paper shows how reusable lemmas are an effective way to reduce
the amount of contracts to be written. 

## Introduction

This work follows the continuous work of making Design-by-Contract simple in its application, expresive to state meaning and powerful by automatically allow static verification to guarantee corectness. First a solid mathmatical foundation was layed by introducint mathematical model library [@schoeller2006]. This allowed to express contracts using libraries which had a mathematical theory supporting them. These basic libraries were then easy to use and reuse. They are the basis for the verified eiffel library base2 [@naumchev2016]. To further make contracts complete as not all the specification of a program can be naturally expressed in precondition, postcondition and class invariants. There are more complex properties which can more elegantly be expressed using specification drivers [@polikarpova2010].

We extend this by using the ideas of specification drivers for mathematical proofs. This will allow two new use-cases.

1. Expressing mathematical theories as Eiffel programs and proving them using the static verifier autoproof [@tschannen2011]
2. Expressing lemmas as Eiffel features which then can be leveraged to proof the implementation of the theory. These lemmas can be generally reused and can be aggregated in a lemma library (L<sup>2</sup>)


## Related Work

## Method
```Eiffel
class A
feature
    foo: BOOLEAN
    require
        PRE
    do
        bar_1
        from
            loo_pre
        until
            loo_exit
        loop
            loo_body
        end
        bar_2
    ensure
        instance_free: class
        POST
    end
end
```

```Eiffel
class THEORY [G]
feature
    induction (prop: G -> BOOLEAN, order: G -> G -> BOOLEAN)
    require
        is_order (order)
        prop (min (order))
        forall x:G ¦ prop (x) -> prop (next (x, order))
    ensure
        forall x:G ¦ prop (x)
    end

    simp (equalities: G -> G -> BOOLEAN)
    require
        forall eq: equalities ¦
end
```

## Results

## References
\full_bibliography