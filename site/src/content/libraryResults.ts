// Derived from archived raw library output; failed calls remain explicit.
export const LIBRARY_RESULTS = {
  "total": 72,
  "errors": [
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "para",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "head",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "btn",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "div",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "uni",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "case": "shape",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')"
    }
  ],
  "successful": 66,
  "paragraphs": [
    {
      "call": "none",
      "error": null,
      "links": 1,
      "names": [
        "the terms"
      ],
      "width": 438
    },
    {
      "call": "gsap@3.15.0 SplitText (default)",
      "error": "page.evaluate: TypeError: Cannot read properties of undefined (reading 'overwrite')",
      "links": null,
      "names": [],
      "width": null
    },
    {
      "call": "gsap@3.15.0 SplitText (type chars,words)",
      "error": null,
      "links": 1,
      "names": [
        ""
      ],
      "width": 441
    },
    {
      "call": "gsap@3.15.0 SplitText (type words)",
      "error": null,
      "links": 1,
      "names": [
        ""
      ],
      "width": 438.1
    },
    {
      "call": "split-type@0.3.4 (default)",
      "error": null,
      "links": 1,
      "names": [
        "t h e t e r m s"
      ],
      "width": 1100
    },
    {
      "call": "split-type@0.3.4 (types words,chars)",
      "error": null,
      "links": 1,
      "names": [
        "t h e t e r m s"
      ],
      "width": 441
    },
    {
      "call": "splitting@1.1.0 (default, no CSS)",
      "error": null,
      "links": 1,
      "names": [
        "the terms"
      ],
      "width": 438.2
    },
    {
      "call": "splitting@1.1.0 (default + its splitting.css rule .char{display:inline-block})",
      "error": null,
      "links": 1,
      "names": [
        "t h e t e r m s"
      ],
      "width": 441
    },
    {
      "call": "motion-plus-dom@3.0.0 splitText (default)",
      "error": null,
      "links": 0,
      "names": [],
      "width": 441
    },
    {
      "call": "animejs@4.5.0 splitText (default)",
      "error": null,
      "links": 2,
      "names": [
        "the terms",
        ""
      ],
      "width": 438.1
    },
    {
      "call": "animejs@4.5.0 splitText (words+chars)",
      "error": null,
      "links": 2,
      "names": [
        "the terms",
        ""
      ],
      "width": 441
    },
    {
      "call": "animejs@4.5.0 splitText (words+chars, accessible:false)",
      "error": null,
      "links": 1,
      "names": [
        "t h e t e r m s"
      ],
      "width": 441
    }
  ]
} as const
