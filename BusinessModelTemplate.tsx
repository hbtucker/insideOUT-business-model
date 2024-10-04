'use client'

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface DataItem {
  name: string
  children?: DataItem[]
  value?: number
}

const data: DataItem = {
  name: "Our Mission",
  children: [
    {
      name: "Value Proposition",
      children: [
        { name: "Product/Service Offering", value: 1 },
        { name: "Customer Benefits", value: 1 },
        { name: "Unique Selling Point", value: 1 }
      ]
    },
    {
      name: "Customer Segments",
      children: [
        { name: "Target Market", value: 1 },
        { name: "Customer Personas", value: 1 },
        { name: "Market Size", value: 1 }
      ]
    },
    {
      name: "Revenue Streams",
      children: [
        { name: "Pricing Model", value: 1 },
        { name: "Sales Channels", value: 1 },
        { name: "Revenue Sources", value: 1 }
      ]
    },
    {
      name: "Key Resources",
      children: [
        { name: "Physical Assets", value: 1 },
        { name: "Intellectual Property", value: 1 },
        { name: "Human Resources", value: 1 }
      ]
    },
    {
      name: "Key Activities",
      children: [
        { name: "Core Operations", value: 1 },
        { name: "Marketing & Sales", value: 1 },
        { name: "R&D", value: 1 }
      ]
    }
  ]
}

export default function BusinessModelTemplate() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current) {
      const width = 928
      const height = width
      const radius = width / 12

      const richerColors = [
        "#FF9AA2", "#A8D8B9", "#8AC6D1", "#FFDAC1", "#E2F0CB",
        "#B5EAD7", "#C7CEEA", "#F6D5E5", "#FFE5B4", "#D4A5A5"
      ]

      const color = d3.scaleOrdinal()
        .domain(data.children?.map(d => d.name) || [])
        .range(richerColors)

      const hierarchy = d3.hierarchy(data)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0))

      const root = d3.partition()
        .size([2 * Math.PI, hierarchy.height + 1])(hierarchy)

      root.each((d: any) => d.current = d)

      const arc = d3.arc<any>()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

      const svg = d3.select(svgRef.current)
        .attr("viewBox", [-width / 2, -height / 2, width, width])
        .style("font-family", "'Poppins', sans-serif")
        .attr("style", "max-width: 100%; height: auto; display: block; margin: 0 -8px; background: #fff; cursor: pointer;")

      const path = svg.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
        .attr("fill", d => {
          while (d.depth > 1) d = d.parent!
          return color(d.data.name)
        })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current))

      path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked)

      const format = d3.format(",d")
      path.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value || 0)}`)

      const label = svg.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name)

      const parent = svg.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked)

      function clicked(event: any, p: any) {
        parent.datum(p.parent || root)

        root.each((d: any) => d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        })

        const t = svg.transition().duration(750)

        path.transition(t)
          .tween("data", (d: any) => {
            const i = d3.interpolate(d.current, d.target)
            return (t: number) => d.current = i(t)
          })
          .filter(function(this: SVGPathElement, d: any) {
            return +this.getAttribute("fill-opacity")! || arcVisible(d.target)
          })
          .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
          .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
          .attrTween("d", (d: any) => () => arc(d.current))

        label.filter(function(this: SVGTextElement, d: any) {
          return +this.getAttribute("fill-opacity")! || labelVisible(d.target)
        })
          .transition(t)
          .attr("fill-opacity", d => +labelVisible(d.target))
          .attrTween("transform", (d: any) => () => labelTransform(d.current))
      }

      function arcVisible(d: any) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
      }

      function labelVisible(d: any) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03
      }

      function labelTransform(d: any) {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI
        const y = ((d.y0 + d.y1) / 2) * radius
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
      }
    }
  }, [])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <svg ref={svgRef} className="w-full h-auto"></svg>
    </div>
  )
}