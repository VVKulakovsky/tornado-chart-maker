// Website kit for the tornado and sensitivity chart maker: guide copy, SEO entry and CMS record. Text CC BY 4.0; code MIT.
// Shapes match website/src/lib/resource-guides.mjs (resourceGuides), website/src/lib/seo.mjs (resourceSEO) and the Resources collection.
export const slug='tornado-chart-maker'
export const version='1.0.0'
export const lastUpdated='2026-10-30'
export const releaseURL='https://github.com/VVKulakovsky/project-risk-open-methods/releases/tag/tornado-chart-maker-v1.0.0'

export const resourceSEO={title:'Tornado chart maker for project risk: sensitivity, rank correlation, regression',hub:'quantitative-risk-analysis',version}

export const resourceGuide={
 title:'Tornado and sensitivity chart maker',
 summary:'Make a labelled tornado chart from one-at-a-time swings, Spearman rank correlation or standardised regression coefficients, and download it as SVG or PNG.',
 definition:'A tornado chart ranks the inputs of a model by their effect on one output, largest at the top. This chart maker computes one of three named statistics, one-at-a-time swing, Spearman rank correlation or standardised regression coefficient, and prints that statistic on the chart.',
 body:`## What does this tornado chart maker do?

Choose a statistic, enter or paste your data and draw the chart. One-at-a-time swing takes a low, base and high value for each input of a simple sum or product model, or outputs you have already calculated. Rank correlation and regression take a table of simulation results, one row per iteration, such as an export from a Monte Carlo model. The chart title and axis always name the statistic, so a reader never has to guess what the bars mean. Download the chart as SVG for documents that stay sharp at any size, or as PNG. The table is read in your browser tab and not uploaded.

## Which statistic should I use?

**One-at-a-time swing** answers "how far does the output move if this input goes from its low to its high value while everything else stays at base?" It is easy to explain and suits deterministic estimates. It ignores interactions and correlations, and the bars do not add up to the total range.

**Spearman rank correlation** answers "how consistently does the output rise or fall with this input across the simulation?" It works for any monotonic relationship and is robust to outliers, which is why most risk software shows it by default. It is not a share of the range, and two correlated inputs can both show strong coefficients for the same cause.

**Standardised regression coefficient** answers "by how many standard deviations does the output move for one standard deviation of this input, holding the others fixed?" It separates the effect of correlated inputs better than rank correlation, but only when a linear model fits well, so the chart shows R² and adds a caution when it is below 0.7. If two inputs are exact linear combinations of each other the tool refuses and names the column.

## Worked example: same data, different statistic

The *linear known* example has 2,000 synthetic iterations of Total cost = 3 × Productivity + 2 × Steel price + 1 × Weather days + noise, every term standard normal, seed 42. Theory gives standardised regression coefficients of 0.775, 0.516 and 0.258. The tool's regression gives 0.761, 0.511 and 0.261 with R² = 0.93; Spearman rank correlation gives 0.756, 0.519 and 0.280. The ranking agrees, but the numbers differ because they measure different things, which is why the chart must say which one it shows.

The *cost drivers* example adds four inputs with a base total of 110 (illustrative USD million). Moving labour productivity from 30 to 48 swings the total from 105 to 123, a swing of 18, so it sits at the top; the fabrication yard rate swings it by only 3.

## How do I read a tornado chart?

Read from the top: the widest bars matter most for this output under these assumptions. In a swing chart, teal shows the output with the input at its low value and copper with the input at its high value; the vertical line is the base. In a correlation or regression chart, copper bars push the output up and teal bars push it down. Inputs below the fifteenth are grouped in a note. A short bar does not prove an input is safe to ignore: a narrow input range can hide a risk that has not been estimated.

## What are the limits?

Sensitivity measures describe the model, not the project. One-at-a-time swings miss interactions. Rank correlation and regression need enough iterations (hundreds at least) and treat each input's sampled values as given; they do not explain correlations that were induced in the model. None of these is a full variance decomposition such as Sobol indices.

## Frequently asked questions

### Why do rank correlation and regression rank inputs differently?

When inputs are correlated with each other, rank correlation credits each with the shared effect, while regression tries to separate them. A difference between the two charts is a prompt to check the model's correlations.

### Can I use output from other risk software?

Yes, if you can export one row per iteration with a column per input and one output column. Up to 50 inputs and 100,000 rows are accepted, numbers only.

### Are the charts reproducible?

Yes. The same table and statistic always produce the same SVG, byte for byte. The tests check this against stored charts.

## Sources and related methods

The statistics follow standard texts: Saltelli and colleagues' [Global Sensitivity Analysis: The Primer](https://doi.org/10.1002/9780470725184), Spearman's [original paper](https://doi.org/10.2307/1412159) and the [NIST/SEMATECH e-Handbook of Statistical Methods](https://www.itl.nist.gov/div898/handbook/). These are external references, not endorsements of this tool. Terms are defined in the [project risk glossary](/glossary#tornado-chart). Generate simulation data with the [schedule risk simulator](/resources/schedule-risk-simulator) or the [Monte Carlo contingency calculator](/resources/contingency-range-explorer), and read the [quantitative risk analysis guide](/quantitative-risk-analysis).`
}

export const cmsRecord={
 title:resourceGuide.title,slug,summary:resourceGuide.summary,topic:'risk',type:'tool',interactive:'tornado',
 body:resourceGuide.body,
 limitations:'The chart describes the model or table you enter, not the project. One-at-a-time swings ignore interactions; rank correlation and regression need hundreds of iterations, and regression assumes a linear fit (check R²). None of these is a full variance decomposition.',
 downloadURL:'/downloads/tornado-chart-maker/sensitivity.mjs',repositoryURL:releaseURL,license:'MIT (code); CC BY 4.0 (text)',
 publicationApproved:false,aiAssisted:true,
}
