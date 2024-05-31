import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StockChart = ({ data, referencePoint = 110 }) => {
    const svgRef = useRef();
    const tooltipRef = useRef();

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        const margin = { top: 20, right: 40, bottom: 30, left: 40 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        svg.selectAll('*').remove(); // Clear previous chart
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const parseTime = d3.timeParse('%Y-%m-%dT%H:%M:%SZ');

        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        // Prepare the data
        const rows = data.map(d => ({
            date: parseTime(d.timestamp),
            price: +d.price,
        }));

        // Check for valid data
        if (rows.some(d => isNaN(d.date) || isNaN(d.price))) {
            console.error('Data contains invalid values');
            return;
        }

        x.domain(d3.extent(rows, d => d.date));
        const yDomain = [
            d3.min(rows, d => d.price < referencePoint ? d.price : referencePoint),
            d3.max(rows, d => d.price > referencePoint ? d.price : referencePoint),
        ];

        y.domain(yDomain);

        // Add horizontal dashed grid lines
        const gridLines = g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(y)
                .ticks(10)
                .tickSize(-width)
                .tickFormat('')
            );

        gridLines.selectAll('line')
            .attr('stroke', '#ccc')
            .attr('stroke-dasharray', '3,3');

        // Draw the reference line
        g.append('line')
            .attr('x1', 0)
            .attr('y1', y(referencePoint))
            .attr('x2', width)
            .attr('y2', y(referencePoint))
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');

        // Define the red shadow filter
        const defs = svg.append('defs');

        const filter = defs.append('filter')
            .attr('id', 'redGlow')
            .attr('width', '300%')
            .attr('height', '300%')
            .attr('x', '-100%')
            .attr('y', '-100%');

        filter.append('feFlood')
            .attr('result', 'flood')
            .attr('flood-color', 'red')
            .attr('flood-opacity', '1');

        filter.append('feComposite')
            .attr('in', 'flood')
            .attr('in2', 'SourceGraphic')
            .attr('operator', 'in')
            .attr('result', 'mask');

        filter.append('feGaussianBlur')
            .attr('in', 'mask')
            .attr('stdDeviation', '3')
            .attr('result', 'blur');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'blur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const greenFilter = defs.append('filter')
            .attr('id', 'greenGlow')
            .attr('width', '300%')
            .attr('height', '300%')
            .attr('x', '-100%')
            .attr('y', '-100%');

        greenFilter.append('feFlood')
            .attr('result', 'flood')
            .attr('flood-color', 'green')
            .attr('flood-opacity', '1');

        greenFilter.append('feComposite')
            .attr('in', 'flood')
            .attr('in2', 'SourceGraphic')
            .attr('operator', 'in')
            .attr('result', 'mask');

        greenFilter.append('feGaussianBlur')
            .attr('in', 'mask')
            .attr('stdDeviation', '3')
            .attr('result', 'blur');

        const greenFeMerge = greenFilter.append('feMerge');
        greenFeMerge.append('feMergeNode').attr('in', 'blur');
        greenFeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Function to split data into segments based on reference point
        const splitDataByReference = (data, reference) => {
            const segments = [];
            let currentSegment = [];
            data.forEach((d, i) => {
                if (currentSegment.length === 0) {
                    currentSegment.push(d);
                } else {
                    const lastPoint = currentSegment[currentSegment.length - 1];
                    if ((lastPoint.price > reference && d.price <= reference) ||
                        (lastPoint.price <= reference && d.price > reference)) {
                        // Interpolation to find the crossing point
                        const interp = d3.interpolateNumber(lastPoint.price, d.price);
                        const t = (reference - lastPoint.price) / (d.price - lastPoint.price);
                        const crossingDate = d3.interpolateDate(lastPoint.date, d.date)(t);
                        currentSegment.push({ date: crossingDate, price: reference });
                        segments.push(currentSegment);
                        currentSegment = [{ date: crossingDate, price: reference }, d];
                    } else {
                        currentSegment.push(d);
                    }
                }
            });
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
            }
            return segments;
        };

        const segments = splitDataByReference(rows, referencePoint);

        // Define the area generator
        const area = d3.area()
            .x(d => x(d.date))
            .y0(y(referencePoint))
            .y1(d => y(d.price))
            .curve(d3.curveLinear);

        // Define the line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price))
            .curve(d3.curveLinear);

        // Draw the areas and lines for each segment
        segments.forEach(segment => {
            const isAbove = segment[0].price >= referencePoint && segment[1].price >= referencePoint;
            g.append('path')
                .datum(segment)
                .attr('fill', isAbove ? 'green' : 'red')
                .attr('opacity', 0.25)
                .attr('d', area);
            g.append('path')
                .datum(segment)
                .attr('fill', 'none')
                .attr('stroke', isAbove ? 'green' : 'red')
                .attr('stroke-width', 3)
                .attr('opacity', 1)
                .attr('d', line);
        });

        // Add the X Axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        g.append('g')
            .call(d3.axisLeft(y));

        // Tooltip, vertical line, vertical block, and highlight circle
        const tooltip = d3.select(tooltipRef.current)
            .style('position', 'absolute')
            .style('background', '#fff')
            .style('border', '1px solid #ccc')
            .style('padding', '5px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        const verticalLine = g.append('line')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .style('opacity', 0);

        const verticalBlock = g.append('rect')
            .attr('fill', 'lightgray')
            .style('opacity', 0);

        const highlightCircle = g.append('circle')
            .attr('fill', 'white')
            .attr('stroke', 'red')
            .attr('stroke-width', 2)
            .attr('r', 5)
            .style('opacity', 0)
            .attr('filter', 'url(#redGlow)');

        // Add mouse event handlers
        svg.on('mousemove', (event) => {
            const [mouseX] = d3.pointer(event);
            const date = x.invert(mouseX - margin.left);
            const closestData = rows.reduce((a, b) => {
                return Math.abs(b.date - date) < Math.abs(a.date - date) ? b : a;
            });

            const leftData = rows.find((d, i) => d.date <= date && (i === rows.length - 1 || rows[i + 1].date > date));

            if (!leftData) return;

            // Interpolate the price for the vertical line
            const nextData = rows.find(d => d.date > leftData.date);
            const interpolatedPrice = nextData 
                ? leftData.price + ((date - leftData.date) / (nextData.date - leftData.date)) * (nextData.price - leftData.price)
                : leftData.price;

            const circleX = x(date);
            const circleY = y(interpolatedPrice);

            verticalLine
                .attr('x1', circleX)
                .attr('y1', 0)
                .attr('x2', circleX)
                .attr('y2', height)
                .style('opacity', 1);

            verticalBlock
                .attr('x', x(leftData.date))
                .attr('y', 0)
                .attr('width', x(d3.timeDay.offset(leftData.date, 1)) - x(leftData.date))
                .attr('height', height)
                .style('opacity', 0.3);

            highlightCircle
                .attr('cx', circleX)
                .attr('cy', circleY)
                .style('opacity', 1)
                .attr('stroke', interpolatedPrice >= referencePoint ? 'green' : 'red')
                .attr('filter', interpolatedPrice >= referencePoint ? 'url(#greenGlow)' : 'url(#redGlow)');

            tooltip.html(`Price: ${interpolatedPrice.toFixed(2)}`)
                .style('left', `${circleX + margin.left + 15}px`)
                .style('top', `${circleY + margin.top - 15}px`)
                .style('opacity', 1);
        }).on('mouseleave', () => {
            verticalLine.style('opacity', 0);
            verticalBlock.style('opacity', 0);
            highlightCircle.style('opacity', 0);
            tooltip.style('opacity', 0);
        });
    }, [data, referencePoint]);

    return (
        <>
            <svg ref={svgRef} width="800" height="400"></svg>
            <div ref={tooltipRef} className="tooltip"></div>
        </>
    );
};

export default StockChart;
