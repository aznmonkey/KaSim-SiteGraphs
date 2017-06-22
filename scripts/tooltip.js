/*jshint esversion: 6*/

class UIManager {
    constructor(renderer) {
        // Define the div for the tooltip
        this.renderer = renderer;
        this.buttonClicked = 0;
        let UI = this;
        this.tip = renderer.root.append("div")	
            .attr("class", "tooltip")	
            .style("font-size", "3em")			
            .style("opacity", 0)
            .style("padding", "0.5em");

        this.cycleDetection = renderer.root.append("div")
            .attr("class", "checkboxDiv")
            .append('label')
            .text("Interactive Mode")
        .append("input")
            .attr("id", "cycleCheckbox")
            .attr("type", "checkbox")
            .on("change", toggleCycleDetection);

        this.stateToggle = renderer.root.append("div")
            .attr("class", "stateButtonDiv")
            .style("right" , 0)
            .style("bottom", 0)
            .style("padding", "4em")
        .append("input")
            .attr("class", "stateButton")
            .attr("type", "button")
            .attr("value", "Show All States")
            .on("click", showStates);

        function toggleCycleDetection() {
            console.log("checked");
            if (d3.select("#cycleCheckbox").property("checked")) {
                renderer.cycleDetect = true;
                renderer.rerenderLinks();
            }
            else 
                renderer.cycleDetect = false;
                renderer.rerenderLinks();
        }

        function showStates() {
            UI.buttonClicked = UI.buttonClicked === 0 ? 1: 0;
            let states = renderer.svg.selectAll(".stateLink"); 
            //let siteNodes = renderer.svg.selectAll("")
            if (UI.buttonClicked) {
                states.attr('opacity', 1);
                renderer.svg.selectAll('.outerSite')
                    .style("fill", function(d) {
                    d.clicked = 1;
                    d.currentColor = "white";
                    return d.currentColor;
                });
                renderer.root.selectAll(".stateButton").attr("value", "Hide All States");
            }
            else { 
                states.attr('opacity', 0);
                renderer.svg.selectAll('.outerSite')
                    .style("fill", function(d) {
                    d.clicked = 0;
                    d.currentColor = d.agent.color;
                    return d.currentColor;
                });
                renderer.root.selectAll(".stateButton").attr("value", "Show All States");
            }
        }
    }
    
    show(d) {        
        this.tip
            .style("right", 0)		
            .style("top", 0)
            .style("background", d.data.color.brighter())
            .style("opacity", .4);
        this.tip
            .text("agent: " + d.data.label)
            .style('fill', d.data.color.darker());
            
    }

    hide() {
        this.tip
            .style("opacity", 0) 
    }
}