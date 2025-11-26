import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Task } from '../types';

interface PlanVisualizationProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const PlanVisualization: React.FC<PlanVisualizationProps> = ({ tasks, onTaskClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!tasks.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // Create DAG structure
    // Nodes
    const nodes = tasks.map(t => ({ id: t.id, group: t.role, data: t }));
    // Links
    const links: any[] = [];
    tasks.forEach(t => {
      t.deps.forEach(dep => {
        // Only link if dependency exists
        if (tasks.find(x => x.id === dep)) {
          links.push({ source: dep, target: t.id });
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", d3.forceCollide(50));

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#64748b")
      .style("stroke", "none");

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#475569")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles (Status colors)
    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d: any) => {
        switch (d.data.status) {
          case 'completed': return '#10b981';
          case 'running': return '#3b82f6';
          case 'failed': return '#ef4444';
          default: return '#1e293b'; // Surface
        }
      })
      .attr("stroke", (d: any) => {
         switch (d.data.status) {
          case 'completed': return '#059669';
          case 'running': return '#2563eb';
          case 'failed': return '#dc2626';
          default: return '#64748b'; // Secondary
        }
      })
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event: any, d: any) => onTaskClick(d.data));

    // Labels
    node.append("text")
      .text((d: any) => d.id)
      .attr("x", 0)
      .attr("y", 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .style("pointer-events", "none");
    
    // Tooltip titles
    node.append("title")
      .text((d: any) => `${d.id}: ${d.data.description}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [tasks, dimensions, onTaskClick]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block"></svg>
      <div className="absolute top-2 right-2 flex flex-col gap-1 text-xs text-slate-400 bg-slate-800/80 p-2 rounded">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500"></div> Pending</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></div> Running</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div> Completed</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></div> Failed</div>
      </div>
    </div>
  );
};

export default PlanVisualization;