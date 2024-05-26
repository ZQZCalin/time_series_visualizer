import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StockChart = ({ data, referencePoint = 110 }) => {
    const svgRef = useRef();
    const tooltipRef = useRef();
    const verticalLineRef = useRef();
    const verticalBlockRef = useRef();

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
            .curve(d3.curveBasis);

        // Define the line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.price))
            .curve(d3.curveBasis);

        // Draw the areas and lines for each segment
        segments.forEach(segment => {
            const isAbove = segment[0].price >= referencePoint && segment[1].price >= referencePoint;
            g.append('path')
                .datum(segment)
                .attr('fill', isAbove ? 'green' : 'red')
                .attr('opacity', 0.3)
                .attr('d', area);
            g.append('path')
                .datum(segment)
                .attr('fill', 'none')
                .attr('stroke', isAbove ? 'green' : 'red')
                .attr('stroke-width', 3)
                .attr('opacity', 0.6)
                .attr('d', line);
        });

        // Add the X Axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the Y Axis
        g.append('g')
            .call(d3.axisLeft(y));

        // Tooltip, vertical line, and vertical block
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
            .attr('fill', 'lightblue')
            .style('opacity', 0);

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

            verticalLine
                .attr('x1', x(date))
                .attr('y1', 0)
                .attr('x2', x(date))
                .attr('y2', height)
                .style('opacity', 1);

            verticalBlock
                .attr('x', x(leftData.date))
                .attr('y', 0)
                .attr('width', x(d3.timeDay.offset(leftData.date, 1)) - x(leftData.date))
                .attr('height', height)
                .style('opacity', 0.3);

            tooltip.html(`Price: ${interpolatedPrice.toFixed(2)}`)
                .style('left', `${x(date) + margin.left + 30}px`)
                .style('top', `${margin.top - 30}px`)
                .style('opacity', 1);
        }).on('mouseout', () => {
            verticalLine.style('opacity', 0);
            verticalBlock.style('opacity', 0);
            tooltip.style('opacity', 0);
        }).on('mouseleave', () => {
            verticalLine.style('opacity', 0);
            verticalBlock.style('opacity', 0);
            tooltip.style('opacity', 0);
        });
    }, [data, referencePoint]);

    return (
        <>
            <svg ref={svgRef} width="760" height="400"></svg>
            <div ref={tooltipRef} className="tooltip"></div>
        </>
    );
};

export default StockChart;
