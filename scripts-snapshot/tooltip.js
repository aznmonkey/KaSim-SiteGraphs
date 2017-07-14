/*jshint esversion: 6*/
class SnapUIManager {
    constructor(renderer) {
        // Define the div for the tooltip
        this.renderer = renderer;
        this.buttonClicked = 0;
        let UI = this;

        this.tip = renderer.root.append("div")	
            .attr("class", "tooltip")	
            .style("font-size", "2em")			
            .style("padding", "0.5em");
           /* add button functionality */
        
        let timeout = d3.timeout(function() {
            d3.select("input[value=\"sumByMass\"]")
                .property("checked", true)
                .dispatch("change");
        }, 2000);
        
        this.renderLegend();
        
        d3.selectAll("input")
            .data([sumByMass, sumByCount, sumBySize], function(d) { return d ? d.name : this.value; })
            .on("change", changed);

        function changed(sum) {
            let width = renderer.layout.dimension.width;
            let data = renderer.layout.snapshot.data;
            let height = renderer.layout.dimension.height;
            let treemap = d3.treemap()
                .tile(d3.treemapResquarify)
                .size([width, height])
                .round(true)
                .paddingInner(4);

            let root = d3.hierarchy(data.treeData)
                .eachBefore(d => { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                .sum( sum )
                .sort((a, b) => { return b.height - a.height || b.value - a.value; });
            
            /*
            let treemap = renderer.treemap;
            let root = renderer.root
                        .sum( sum )
                        .sort((a, b) => { return b.height - a.height || b.value - a.value; });
            */
            treemap(root);
            timeout.stop();
            
            //renderer.nodeTreemap(renderer.nodeRoot);
            d3.selectAll(".treeSpecies")
                .data(root.leaves())
                .attr("id", d => d.data.id)
            .transition()
                .duration(750)
                .attr("transform", d => { let x = d.x0 + (renderer.layout.margin.left + renderer.layout.margin.right)/2;
                                            let y = d.y0 + (renderer.layout.margin.top + renderer.layout.margin.bottom)/2;
                                            return "translate(" + x + "," + y + ")"; })
                
                .select("rect")
                .attr("width", d => { return d.x1 - d.x0; })
                .attr("height", d => { return d.y1 - d.y0; });

            renderer.removeNodes();
            renderer.renderNodes();
            
        }

        function sumByCount(d) {
            return d.count;
        }

        function sumBySize(d) {
            return d.size;
        }

        function sumByMass(d) {
            return d.count * d.size;
        }
    }
    
    renderLegend() {
        //console.log("hi");
        let legendRectSize = 5;
        let legendSpacing = 4;
        let renderer = this.renderer;
        let svg = renderer.svg;
        let legend = svg.selectAll('.legend')                      
          .data(renderer.coloring)                                                                              
          .append('g')                                             
          .attr('class', 'legend')                                 
          .attr('transform', function(d, i) { 
            //console.log(d);                     
            let height = legendRectSize + legendSpacing;           
            let offset =  height * rednerer.coloring.length / 2;      
            let horz = -2 * legendRectSize;                        
            let vert = i * height - offset;                        
            return 'translate(' + horz + ',' + vert + ')';         
          });                                                      

        legend.append('rect')                                      
          .attr('width', legendRectSize)                           
          .attr('height', legendRectSize)                          
          .style('fill', d => console.log(d));                                    
          //.style('stroke', color);                                 

        legend.append('text')                                      
          .attr('x', legendRectSize + legendSpacing)               
          .attr('y', legendRectSize - legendSpacing)               
          .text(function(d) { return d; });                        
    }

    showSpecies(d) { 
      
        let renderer = this.renderer;
        this.tip
            .style("text-opacity", 1)
            .style("background", d => {
                let color = d3.rgb("white");
                color.opacity = 0.4;
                return color;
            })

        let speciesTip = this.tip
            .text("count: " + d.data.count)
            .style('color', "black");
    }     
    

}