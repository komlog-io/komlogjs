import * as d3 from 'd3';
import * as utils from './utils.js';

d3.selection.prototype.moveToFront = function() {
    return this.each(function () {
        this.parentNode.appendChild(this);
    });
};

d3.selection.prototype.moveToBack = function() {
    return this.each(function () {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

var formatMillisecond = d3.timeFormat(".%L"),
    formatSecond = d3.timeFormat(":%S"),
    formatMinute = d3.timeFormat("%I:%M"),
    formatHour = d3.timeFormat("%I %p"),
    formatDay = d3.timeFormat("%a %d"),
    formatWeek = d3.timeFormat("%b %d"),
    formatMonth = d3.timeFormat("%B"),
    formatYear = d3.timeFormat("%Y");

function customTimeFormat(date) {
  return (d3.timeSecond(date) < date ? formatMillisecond
      : d3.timeMinute(date) < date ? formatSecond
      : d3.timeHour(date) < date ? formatMinute
      : d3.timeDay(date) < date ? formatHour
      : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
      : d3.timeYear(date) < date ? formatMonth
      : formatYear)(date);
}

let d3TimeSlider = {
    update: function (el, interval, notifyNewInterval) {
        var its = interval.its,
            ets = interval.ets;
        if (its == null || ets == null) {
            return;
        }
        var margin = {top: 5, right: 0, bottom: 20, left: 0};
        var width=d3.select(el).node().getBoundingClientRect().width,
            height=10;
        if (width == 0) {
            return;
        }
        var dateFormat = d3.timeFormat("%b %d %H:%M");
        function brushstart () {
            svg.classed("selecting", true);
            svg.select('.date-tooltip-left')
                .transition()
                .duration(300)
                .style('opacity',0.8);
            svg.select('.date-tooltip-right')
                .transition()
                .duration(300)
                .style('opacity',0.8);
        }
        function brushmove () {
            if (!d3.event.selection) return;
            var positions=d3.event.selection;
            var leftX=positions[0];
            var rightX=positions[1];
            var dateTextLeft=dateFormat(x.invert(positions[0]));
            var dateTextRight=dateFormat(x.invert(positions[1]));
            var dateRectLeftWidth=(dateTextLeft.length+1)*8;
            var dateRectRightWidth=(dateTextRight.length+1)*8;
            var leftXOffset=leftX-dateRectLeftWidth < 0 ? 0 : leftX > width - dateRectRightWidth ? width-dateRectRightWidth - dateRectLeftWidth : leftX-dateRectLeftWidth;
            var rightXOffset=rightX+dateRectRightWidth > width ? width-dateRectRightWidth : rightX < dateRectLeftWidth ? dateRectLeftWidth : rightX;
            svg.selectAll('.date-tooltip-left')
                .select('text')
                .attr('transform', 'translate('+leftXOffset+',0)')
                .text(dateTextLeft);
            svg.selectAll('.date-tooltip-left')
                .select('rect')
                .attr('transform', 'translate('+leftXOffset+',0)')
                .attr('width',dateRectLeftWidth);
            svg.selectAll('.date-tooltip-right')
                .select('text')
                .attr('transform', 'translate('+rightXOffset+',0)')
                .text(dateTextRight);
            svg.selectAll('.date-tooltip-right')
                .select('rect')
                .attr('transform', 'translate('+rightXOffset+',0)')
                .attr('width',dateRectRightWidth);
        }

        function brushend () {
            svg.select('.date-tooltip-left')
                .transition()
                .duration(2000)
                .style('opacity',0);
            svg.select('.date-tooltip-right')
                .transition()
                .duration(2000)
                .style('opacity',0);
            svg.classed("selecting", false);
            if (!d3.event.sourceEvent) return; // Only transition after input.
            var selection = d3.event.selection;
            var newInterval={its:x.invert(selection[0]).getTime()/1000,ets:x.invert(selection[1]).getTime()/1000};
            notifyNewInterval(newInterval);
        }

        var intervalInit=new Date(its*1000);
        var intervalEnd=new Date(ets*1000);
        var intervalMsDuration=Math.abs(ets*1000-its*1000);
        var axisInit=new Date(its*1000-3*intervalMsDuration);
        var axisEnd=new Date(ets*1000+3*intervalMsDuration);
        var x = d3.scaleTime()
            .range([0, width])
            .domain([axisInit,axisEnd]);
        var xAxis = d3.axisBottom(x)
            .tickFormat(customTimeFormat)
            .tickSize(3)
            .ticks(2);
        var brush = d3.brushX()
            .extent([[x.range()[0],0],[x.range()[1],height]])
            .on("start", brushstart)
            .on("brush", brushmove)
            .on("end", brushend);
        var svg = d3.select(el).select("svg");
        var brushg = svg.select(".brush");
        brushg.call(brush);

        svg.transition().duration(300)
            .select(".x-axis")
            .call(xAxis);

        svg.transition().duration(300)
            .select(".brush")
            .call(brush.move, [x(intervalInit),x(intervalEnd)]);
    },

    create: function (el, interval, notifyNewInterval) {
        var its = interval.its,
            ets = interval.ets;
        if (ets == null) {
            ets=(new Date()).getTime()/1000;
        }
        if (its == null) {
            its=ets-3600;
        }
        var margin = {top: 5, right: 0, bottom: 25, left: 0};
        var width=d3.select(el).node().getBoundingClientRect().width,
            height=10;
        var dateFormat = d3.timeFormat("%b %d %H:%M");
        function brushstart () {
            svg.classed("selecting", true);
            svg.select('.date-tooltip-left')
                .transition()
                .duration(300)
                .style('opacity',0.8);
            svg.select('.date-tooltip-right')
                .transition()
                .duration(300)
                .style('opacity',0.8);
        }
        function brushmove () {
            if (!d3.event.selection) return;
            var positions=d3.event.selection;
            var leftX=x(positions[0]);
            var rightX=x(positions[1]);
            var dateTextLeft=dateFormat(x.invert(positions[0]));
            var dateTextRight=dateFormat(x.invert(positions[1]));
            var dateRectLeftWidth=(dateTextLeft.length+1)*8;
            var dateRectRightWidth=(dateTextRight.length+1)*8;
            var leftXOffset=leftX-dateRectLeftWidth < 0 ? 0 : leftX > width - dateRectRightWidth ? width-dateRectRightWidth - dateRectLeftWidth : leftX-dateRectLeftWidth;
            var rightXOffset=rightX+dateRectRightWidth > width ? width-dateRectRightWidth : rightX < dateRectLeftWidth ? dateRectLeftWidth : rightX;
            svg.selectAll('.date-tooltip-left')
                .select('text')
                .attr('transform', 'translate('+leftXOffset+',0)')
                .text(dateTextLeft);
            svg.selectAll('.date-tooltip-left')
                .select('rect')
                .attr('transform', 'translate('+leftXOffset+',0)')
                .attr('width',dateRectLeftWidth);
            svg.selectAll('.date-tooltip-right')
                .select('text')
                .attr('transform', 'translate('+rightXOffset+',0)')
                .text(dateTextRight);
            svg.selectAll('.date-tooltip-right')
                .select('rect')
                .attr('transform', 'translate('+rightXOffset+',0)')
                .attr('width',dateRectRightWidth);
        }

        function brushend () {
            svg.select('.date-tooltip-left')
                .transition()
                .duration(2000)
                .style('opacity',0);
            svg.select('.date-tooltip-right')
                .transition()
                .duration(2000)
                .style('opacity',0);
            svg.classed("selecting", false);
            if (!d3.event.sourceEvent) return; // Only transition after input.
            var selection = d3.event.selection;
            var newInterval={its:x.invert(selection[0]).getTime()/1000,ets:x.invert(selection[1]).getTime()/1000};
            notifyNewInterval(newInterval);
        }
        var intervalInit=new Date(its*1000);
        var intervalEnd=new Date(ets*1000);
        var intervalMsDuration=Math.abs(ets*1000-its*1000);
        var axisInit=new Date(its*1000-3*intervalMsDuration);
        var axisEnd=new Date(ets*1000+3*intervalMsDuration);
        var x = d3.scaleTime()
            .range([0, width])
            .domain([axisInit,axisEnd]);
        var xAxis = d3.axisBottom(x)
            .tickFormat(customTimeFormat)
            .tickSize(3)
            .ticks(2);
        var brush = d3.brushX()
            .extent([[x.range()[0],0],[x.range()[1],height]])
            .on("start",brushstart)
            .on("brush", brushmove)
            .on("end", brushend);
        var arc = d3.arc()
            .outerRadius(height / 2 - 1)
            .startAngle(0)
            .endAngle( (d, i) => { return i ? -Math.PI : Math.PI; });
        var svg = d3.select(el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .style('shape-rendering','crispEdges')
            .style('fill','#444')
            .call(xAxis);
        var brushg = svg.append("g")
            .attr("class", "brush")
            .style('fill','#ddd')
            .style('shape-rendering','crispEdges')
            .call(brush)
            .call(brush.move, [x(intervalInit),x(intervalEnd)]);
        brushg.selectAll(".resize")
            .append("path")
            .attr("transform", "translate(0," +  (height / 2 + 1) + ")")
            .attr("d", arc);
        brushg.selectAll("rect")
            .attr("height", height-2)
            .attr("transform", "translate(0,2)");

        var dateTooltipLeft=svg.append("g")
            .attr("class", "date-tooltip-left")
            .style("opacity", 0);

        var dateTooltipRight=svg.append("g")
            .attr("class", "date-tooltip-right")
            .style("opacity", 0);

        dateTooltipLeft.append("rect")
            .attr("x", 0)
            .attr("y", height+5)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltipRight.append("rect")
            .attr("x", 0)
            .attr("y", height+5)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltipLeft.append("text")
            .attr("x", 12)
            .attr("y", height)
            .attr("dy", "1.5em")
            .style('fill','#444');

        dateTooltipRight.append("text")
            .attr("class", "date-tooltip-right")
            .attr("x", 12)
            .attr("y", height)
            .attr("dy", "1.5em")
            .style('fill','#444');

        dateTooltipLeft.selectAll('*')
            .attr("transform", "translate("+width/7*3+",0)");

        dateTooltipRight.selectAll('*')
            .attr("transform", "translate("+width/7*4+",0)");
    }
}

let d3Linegraph = {
    create: function (el, data, interval, newIntervalCallback, metadata) {
        var margin = {top: 0, right: 0, bottom: 40, left: 0},
            height = 220 - margin.top - margin.bottom,
            width=d3.select(el).node().getBoundingClientRect().width-margin.left;

        var svg = d3.select(el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "grid");

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .style('shape-rendering','crispEdges');

        svg.append("g")
            .attr("class", "y-axis")
            .style('shape-rendering','crispEdges');

        svg.append('g')
            .attr('class', 'anomalies');

        var dateTooltip = svg.append('g')
            .attr('class', 'date-tooltip')
            .style('opacity', 0);

        dateTooltip.append("rect")
            .attr("x", 0)
            .attr("y", height+10)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltip.append("text")
            .attr("x", 12)
            .attr("y", height+20)
            .attr("dy", ".4em")
            .style('fill','#444');

        dateTooltip.append('line')
            .attr('x1',0)
            .attr('y1',0)
            .attr('x2',0)
            .attr('y2',height)
            .attr('stroke', '#aaa');

        this.update(el, data, interval, newIntervalCallback, metadata);
    },

    update: function (el, data, interval, newIntervalCallback, metadata) {
        var mouseIn = null,
            x = null,
            y = null,
            its = interval.its,
            ets = interval.ets;
        var bisectDate = d3.bisector(function(d) { return d.ts; }).left;
        var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
        var margin = {top: 0, right: 0, bottom: 40, left: 0},
            height = 220 - margin.top - margin.bottom,
            width=d3.select(el).node().getBoundingClientRect().width-margin.left;
        if (width == 0) {
            return;
        }


        function update_axis_domains () {
            var y_values_array=[];
            var max_index=0;
            var min_index=null;
            for (var i=0, j=data.length;i<j;i++) {
                var domainData = data[i].data.filter((d,index) => {
                    if (its <= d.ts && d.ts <= ets){
                        if (index>max_index) {
                            max_index = index;
                        }
                        if (min_index == null || i<min_index) {
                            min_index = index;
                        }
                        return true;
                    }
                });
                if (max_index < data[i].data.length -1) {
                    domainData.push(data[i].data[max_index+1]);
                }
                if (min_index > 0) {
                    domainData.push(data[i].data[min_index-1]);
                }
                max_index = 0;
                min_index = null;
                var max = d3.max(domainData, d => d.value );
                var min = d3.min(domainData, d => d.value );
                y_values_array.push(min);
                y_values_array.push(max);
            }

            var yDomain=d3.extent(y_values_array),
                yMargin=(yDomain[1]-yDomain[0])*0.1;
            if (yMargin==0) {
                yMargin=1
            }
            y = d3.scaleLinear()
                .domain([yDomain[0]-yMargin,yDomain[1]+yMargin])
                .rangeRound([height, 0]);

            x = d3.scaleTime()
                .range([0, width])
                .domain([new Date(its*1000),new Date(ets*1000)]);
        }

        function make_y_axis() {
            return d3.axisRight(y)
            .ticks(4,",f");
        }

        function adjust_y_axis_text(selection) {
            selection.selectAll('.y-axis text')
            .attr('transform', 'translate(0,-5)');
        }

        function make_x_axis () {
            return d3.axisBottom(x)
            .ticks(3)
            .tickFormat(customTimeFormat);
        }

        function update_x_axis () {
            svg.select('.x-axis')
                .transition()
                .duration(300)
                .call(make_x_axis())
                .selectAll('.tick')
                .style('opacity', mouseIn == true ? 0 : 1);
        }

        function update_y_axis () {
            svg.select(".grid")
                .transition()
                .duration(300)
                .call(make_y_axis()
                    .tickSize(width, 0, 0)
                );

            svg.select('.y-axis')
                .transition()
                .duration(300)
                .call(make_y_axis()
                    .tickSize(0, 0, 0)
                )
                .call(adjust_y_axis_text);
        }

        function update_anomalies () {
            console.log('anomalias',metadata);
            var anomalies = svg.select('.anomalies');

            var anomaly = anomalies.selectAll('.anomaly')
                .data(metadata.anomalies, d => d[0])

            anomaly.attr("x", d => x(new Date(d[0]*1000)))
                .attr("width", d => x(new Date(d[1]*1000))-x(new Date(d[0]*1000)));

            anomaly.exit()
                .remove();

            anomaly.enter()
                .append("rect")
                .attr("class", "anomaly")
                .attr("x", d => x(new Date(d[0]*1000)))
                .attr("y", 0)
                .attr("width", d => x(new Date(d[1]*1000))-x(new Date(d[0]*1000)))
                .attr("height", height)
                .style("fill", "pink")
                .style("opacity", 0.4);
        }

        function update_lines () {

            var line = d3.line()
                .x(d => x(new Date(d.ts*1000)))
                .y(d => y(d.value));
            var lines=svg.selectAll('.line')
                .data(data, d => d.pid)

            lines.style('stroke', d => d.color)
                .attr('d', d => line(d.data));

            lines.exit()
                .remove();

            lines.enter()
                .append('path')
                .style('fill','none')
                .style('stroke', d => d.color)
                .style('stroke-linecap','round')
                .attr('class','line')
                .attr('d', d => line(d.data))
                .merge(lines)
                .style('stroke-width',3);
        }

        function zoom (interval) {
            ets = interval.ets;
            its = interval.its;

            update_axis_domains();
            update_x_axis();
            update_y_axis();
            update_anomalies();
            update_lines();
        }

        var svg = d3.select(el).select("svg g");

        update_axis_domains();
        update_x_axis();
        update_y_axis();
        update_anomalies();
        update_lines();

        var focus_enter = svg.selectAll(".focus")
            .data(data, d => d.pid)
            .enter()
            .append("g")
            .attr("class", "focus")
            .attr("id", d => "dp-"+d.pid)
            .style("opacity", 0);

        focus_enter.append("circle")
            .attr("r", 4,5)
            .attr("fill", 'white')
            .style('stroke', d => d.color);

        focus_enter.append("rect")
            .attr("x", 5)
            .attr("y", 4)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", d => d.color);

        focus_enter.append("text")
            .attr("x", 12)
            .attr("y", 12)
            .attr("dy", ".5em")
            .style('fill','#444')

        svg.selectAll(".focus")
            .data(data, d => d.pid)
            .exit()
            .remove();

        svg.selectAll(".focus circle")
            .data(data, d => d.pid)
            .transition()
            .duration(300)
            .style('stroke', d => d.color);

        svg.selectAll(".focus rect")
            .data(data, d => d.pid)
            .transition()
            .duration(300)
            .style('fill', d => d.color);

        if (svg.select('.zoom-area').empty()) {
            var zoomArea = svg.append('g')
                .attr('class', 'zoom-area')
                .style('opacity', 0);

            zoomArea.append("rect")
                .attr("id", null)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0)
                .attr("height", height)
                .attr("rx", 0)
                .attr("ry", 0)
                .style("fill", '#eee');
        }

        svg.select('.overlay').remove();

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .on("mouseenter",mouseenter)
            .on("mouseleave",mouseleave)
            .on("mousemove",mousemove)
            .on("mousedown",mousedown)
            .on("mouseup",mouseup);

        function mouseenter () {
            mouseIn=true;
            d3.select(el).select('.x-axis')
                .selectAll('.tick')
                .transition()
                .duration(300)
                .style('opacity', 0);
            d3.select(el)
                .selectAll(".focus")
                .transition()
                .duration(300)
                .style('opacity', 1);
            d3.select(el)
                .selectAll(".focus")
                .selectAll("rect")
                .transition()
                .duration(300)
                .style('opacity', 0.4);
            d3.select(el).select('.date-tooltip')
                .transition()
                .duration(300)
                .style('opacity', 0.6);
        }

        function mouseleave () {
            mouseIn=false;
            d3.select(el).select('.x-axis')
                .selectAll('.tick')
                .transition()
                .duration(300)
                .style('opacity', 1);
            d3.select(el)
                .selectAll(".focus")
                .transition()
                .duration(100)
                .style('opacity', 0);
            d3.select(el).select('.date-tooltip')
                .transition()
                .duration(100)
                .style('opacity', 0);
            var zoomArea = svg.select('.zoom-area')
                .style('opacity', 0)
            zoomArea.select("rect")
                .attr("id", null)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0)
                .attr("height", height)
                .attr("rx", 0)
                .attr("ry", 0)
                .style("fill", '#eee')
            svg.select('.overlay')
                .style('cursor','default');
        }

        function mousedown () {
            d3.event.preventDefault();
            var xPos=d3.mouse(this)[0]
            var zoomArea = svg.select('.zoom-area')
                .style('opacity', 0.5);
            zoomArea.select("rect")
                .attr("id", "p-"+xPos)
                .attr("x", xPos)
                .attr("y", 0)
                .attr("width", 1)
                .attr("height", height)
                .attr("rx", 0)
                .attr("ry", 0)
                .style("fill", '#eee');
            svg.select('.overlay')
                .style('cursor','col-resize');
        }

        function mouseup () {
            mouseIn=true;
            var xPos=d3.mouse(this)[0];
            var zoomArea = svg.select('.zoom-area')
                .style('opacity', 0);
            var updateInterval=false;
            if (!zoomArea.empty() && zoomArea.select('rect').attr('id') != null) {
                var initialPos = parseInt(zoomArea.select('rect').attr('id').split('-')[1]);
                var startInterval = x.invert(initialPos).getTime()/1000;
                var endInterval = x.invert(xPos).getTime()/1000;
                var its = startInterval < endInterval ? startInterval : endInterval;
                var ets = endInterval >= startInterval ? endInterval : startInterval;
                updateInterval=(Math.abs(xPos-initialPos) > 10 && ets-its > 30) ? true : false;
            }
            zoomArea.select("rect")
                .attr("id", null)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 0)
                .attr("height", height)
                .attr("rx", 0)
                .attr("ry", 0)
                .style("fill", '#eee');
            if (updateInterval == true) {
                var newInterval={its:its, ets:ets};
                zoom(newInterval);
                newIntervalCallback(newInterval);
            }
            svg.select('.overlay')
                .style('cursor','default');
        }

        function mousemove () {
            d3.event.preventDefault();
            var xPos=d3.mouse(this)[0]
            var date=x.invert(xPos);
            var x0 = date.getTime()/1000;
            var dateText=dateFormat(date)
            var dateRectWidth=(dateText.length+1)*8
            var xOffset=xPos<dateRectWidth/2 ? -xPos : xPos+dateRectWidth/2 > width ? width-xPos-dateRectWidth : -dateRectWidth/2;
            var yOffset = 0;
            var zoomArea=d3.select(el).select('.zoom-area')
            d3.select(el).select('.date-tooltip')
                .attr('transform', 'translate('+xPos+',0)');
            d3.select(el).select('.date-tooltip')
                .select('text')
                .attr('transform', 'translate('+xOffset+',0)')
                .text(dateText);
            d3.select(el).select('.date-tooltip')
                .select('rect')
                .attr('transform', 'translate('+xOffset+',0)')
                .attr('width',dateRectWidth);
            if (!zoomArea.empty() && zoomArea.select('rect').attr('id') != null) {
                var initialPos = parseInt(zoomArea.select('rect').attr('id').split('-')[1]);
                var zoomAreaX = initialPos < xPos ? initialPos : xPos;
                d3.select(el).select('.zoom-area')
                    .select('rect')
                    .attr('x',zoomAreaX)
                    .attr('width',Math.abs(initialPos-xPos));
            }
            var dpBanners = [];
            for (var j=0;j<data.length;j++) {
                var i = bisectDate(data[j].data, x0,1);
                i=i<1 ? 1 : i==data[j].data.length ? data[j].data.length -1 : i;
                if (data[j].data.length > 1) {
                    var d0 = data[j].data[i - 1],
                        d1 = data[j].data[i];
                    var d = x0 - d0.ts > d1.ts - x0 ? d1 : d0;
                    var pointX=x(new Date(d.ts*1000));
                    var pointY=y(d.value);
                    var rectWidth=(d.value.toString().length+1)*10;
                } else if (data[j].data.length == 1) {
                    var d = data[j].data[0];
                    var pointX=x(new Date(d.ts*1000));
                    var pointY=y(d.value);
                    var rectWidth=(d.value.toString().length+1)*10;
                } else {
                    var d = {value:''};
                    var pointX = -20;
                    var pointY = -20;
                    var rectWidth = 0
                }
                xOffset=pointX+rectWidth+5 > width ? width-pointX-rectWidth-5 : 0;
                dpBanners.push({pid:data[j].pid, value:d.value, pointX:pointX, pointY:pointY, rectWidth:rectWidth, xOffset:xOffset, yOffset:yOffset});
            }
            dpBanners.sort((a,b) => b.pointY - a.pointY);
            for (var i=1, j=dpBanners.length; i<j; i++) {
                var a = dpBanners[i];
                var b = dpBanners[i-1];
                var collisionL1 = !(
                    ((a.pointY + a.yOffset + 20) < (b.pointY)) ||
                    (a.pointY > (b.pointY + b.yOffset + 20)) ||
                    ((a.pointX + a.xOffset + a.rectWidth +10) < b.pointX) ||
                    (a.pointX > (b.pointX + b.rectWidth + b.xOffset +10))
                    );
                if (collisionL1) {
                    // move to left
                    a.xOffset = -a.rectWidth;
                    if ((a.pointX + a.xOffset) < 0 ) {
                        a.xOffset = -a.pointX;
                        b.xOffset += a.rectWidth-a.pointX;
                    }
                    if ((b.pointX + b.rectWidth + 5) > width) {
                        a.xOffset += width - b.pointX - b.rectWidth - 5;
                    }
                }
                if (i>1) {
                    var c = dpBanners[i-2];
                    var collisionL2 = !(
                        ((a.pointY + a.yOffset + 20) < (c.pointY)) ||
                        (a.pointY > (c.pointY + c.yOffset + 20)) ||
                        ((a.pointX + a.xOffset + a.rectWidth) < c.pointX) ||
                        (a.pointX > (c.pointX + c.rectWidth + c.xOffset))
                        );
                    if (collisionL2) {
                        // move up
                        a.yOffset = c.pointY - a.pointY - a.yOffset -20;
                        if ((a.pointY + a.yOffset) < 0) {
                            a.yOffset = -a.pointY;
                            c.yOffset += 20 - c.pointY;
                        }
                    }
                }
            }
            for (var i=0, j=dpBanners.length; i<j; i++) {
                var dp = dpBanners[i];
                d3.select(el).select("#dp-"+dp.pid)
                    .attr("transform", "translate(" + dp.pointX + "," + dp.pointY + ")");
                d3.select(el).select("#dp-"+dp.pid)
                    .select("text")
                    .attr("font-size","14px")
                    .attr("font-weight","bold")
                    .attr("transform", "translate("+dp.xOffset+","+dp.yOffset+")")
                    .text(d3.format(",")(dp.value));
                d3.select(el).select("#dp-"+dp.pid)
                    .select("rect")
                    .attr("transform", "translate("+dp.xOffset+","+dp.yOffset+")")
                    .attr("width", dp.rectWidth);
            }

        }
    }
}

let d3Histogram = {
    create: function (el, data) {
        var margin = {top: 0, right: 0, bottom: 40, left: 0},
            height = 220 - margin.top - margin.bottom,
            width=d3.select(el).node().getBoundingClientRect().width;

        var svg = d3.select(el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", "grid");

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .style('shape-rendering','crispEdges');

        svg.append("g")
            .attr("class", "y-axis")
            .style('shape-rendering','crispEdges');

        var barTooltip = svg.append("g")
            .attr('class', 'bar-tooltip');

        barTooltip.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", 0)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        barTooltip.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", ".4em")
            .style('fill','#444');

        this.update(el, data)
    },

    update: function (el, data) {
        var formatCount = d3.format(",.0f");
        var formatDecimal = d3.format(",.2f");
        var formatPercent = d3.format(".1%");
        var formatValue = d3.format("s");
        var margin = {top: 0, right: 0, bottom: 40, left: 0},
            height = 220 - margin.top - margin.bottom,
            width = d3.select(el).node().getBoundingClientRect().width;
        if (width == 0) {
            return;
        }
        var x_values=[];
        function make_x_axis() {
            return d3.axisBottom(x)
            .ticks(3)
            .tickFormat(formatValue);
        }
        function make_y_axis() {
            return d3.axisRight(y)
            .ticks(4);
        }
        function adjust_y_axis_text(selection) {
            selection.selectAll('.y-axis text')
            .attr('transform', 'translate(0,-5)');
        }
        function update_x_axis () {
            svg.select('.x-axis')
                .transition()
                .duration(300)
                .call(make_x_axis())
                .selectAll('.tick');
        }
        function update_y_axis () {
            svg.select(".grid")
                .transition()
                .duration(300)
                .call(make_y_axis()
                    .tickSize(width, 0, 0)
                );

            svg.select('.y-axis')
                .transition()
                .duration(300)
                .call(make_y_axis()
                    .tickSize(0, 0, 0)
                    .tickFormat(formatPercent)
                )
                .call(adjust_y_axis_text);
        }
        function mouseenter () {
            var bar=d3.select(this);

            bar.moveToFront();
            bar.attr("x", bar.attr("x")-4)
                .attr("y", bar.attr("y")-2)
                .attr("width", parseInt(bar.attr("width"))+8)
                .attr("height", parseInt(bar.attr("height"))+2);

            var barTooltip = svg.append("g")
                .attr('class', 'bar-tooltip')
                .attr("pointer-events", "none")
                .style("opacity",0.8);

            var rangeInit=formatDecimal(x.invert(bar.attr("x_orig")));
            var rangeEnd=formatDecimal(x.invert(parseInt(bar.attr("x_orig"))+parseInt(bar.attr("width_orig"))));
            var textLines=[
                "Percent: "+formatPercent(parseInt(bar.attr("pct").split("/")[0])/parseInt(bar.attr("pct").split("/")[1])),
                "Sample count: "+bar.attr("pct"),
                "Interval: ["+rangeInit+" , "+rangeEnd+"]",
            ];
            var tooltipX=parseInt(bar.attr("x"))+parseInt(bar.attr("width"))+5;
            var tooltipY=10;
            var tooltipWidth=d3.max(textLines, d => d.length*7);
            var tooltipHeight=80;

            if (tooltipX + tooltipWidth> width) {
                tooltipX = width - tooltipWidth;
            }

            barTooltip.append("rect")
                .attr("x", tooltipX)
                .attr("y", tooltipY)
                .attr("width", tooltipWidth)
                .attr("height", tooltipHeight)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", 'white')
                .style("stroke", '#ccc');

            barTooltip.append("text")
                .append("tspan")
                .attr("x", parseInt(tooltipX)+5)
                .attr("y", parseInt(tooltipY)+5+20)
                .text(textLines[0])
                .append("tspan")
                .attr("x", parseInt(tooltipX)+5)
                .attr("y", parseInt(tooltipY)+5+40)
                .text(textLines[1])
                .append("tspan")
                .attr("x", parseInt(tooltipX)+5)
                .attr("y", parseInt(tooltipY)+5+60)
                .text(textLines[2]);
        }

        function mouseout () {
            var bar=d3.select(this);

            svg.selectAll('.bar-tooltip').remove();

            bar.attr("x", bar.attr("x_orig"))
                .attr("y", bar.attr("y_orig"))
                .attr("width", bar.attr("width_orig"))
                .attr("height", bar.attr("height_orig"));

        }

        for (var i in data) {
            data[i].values=data[i].data.map( d => d.value);
        }
        var x_domain = [];
        for (var i in data) {
            var extent = d3.extent(data[i].values);
            x_domain.push(extent[0]);
            x_domain.push(extent[1]);
        }
        x_domain = d3.extent(x_domain);
        var xMargin=(x_domain[1]-x_domain[0])*0.1;
        if (xMargin==0) {
            xMargin=1
        }
        var num_ticks=parseInt((x_domain[1]-x_domain[0])/100);
        if (num_ticks<10) {
            num_ticks=10;
        } else if (num_ticks>30) {
            num_ticks=30;
        }
        var x = d3.scaleLinear()
            .range([0, width])
            .domain([x_domain[0]-xMargin,x_domain[1]+xMargin]);
        for (var i in data) {
            data[i].histogram = d3.histogram().thresholds(x.ticks(num_ticks))(data[i].values);
        }
        var y = d3.scaleLinear()
            .domain([0, d3.max(data.map(function(d) { return d3.max(d.histogram, e => e.length)/d.values.length }))])
            .rangeRound([height, 0]);
        var svg = d3.select(el).select("svg").select('g');

        update_x_axis();
        update_y_axis();

        var histograms = svg.selectAll(".histogram")
            .data(data, d => d.pid);
        histograms.enter()
            .append('g')
            .attr('class','histogram')
            .each( function(d) {
                var total_values=d.values.length;
                var rects=d3.select(this).selectAll('rect')
                    .data(d.histogram, d => d.x0)
                    .enter()
                    .append('rect')
                    .attr("pct", d => d.length+'/'+total_values)
                    .attr("x", d => x(d.x0))
                    .attr("x_orig", d => x(d.x0))
                    .attr("y", d => y(d.length/total_values))
                    .attr("y_orig", d => y(d.length/total_values))
                    .style('fill',d.color)
                    .style('stroke','white')
                    .style('stroke-width','1')
                    .attr("width", d => x(d.x1)-x(d.x0)-1)
                    .attr("width_orig", d => x(d.x1)-x(d.x0)-1)
                    .attr("height", d => height - y(d.length/total_values))
                    .attr("height_orig", d => height - y(d.length/total_values))
                    .on("mouseenter",mouseenter)
                    .on("mouseout",mouseout);
                });
        histograms.exit().remove();
        histograms.each( function(d) {
            var total_values=d.values.length;
            var rects=d3.select(this).selectAll('rect')
                .data(d.histogram, function(d) {return d.x});
            rects.enter()
                .append('rect')
                .on("mouseenter",mouseenter)
                .on("mouseout",mouseout)
                .attr("pct", d => d.length+'/'+total_values)
                .attr("x", d => x(d.x0))
                .attr("x_orig", d => x(d.x0))
                .attr("y", d => y(d.length/total_values))
                .attr("y_orig", d => y(d.length/total_values))
                .style('fill',d.color)
                .style('stroke','white')
                .style('stroke-width','1')
                .attr("width", d => x(d.x1)-x(d.x0)-1)
                .attr("width_orig", d => x(d.x1)-x(d.x0)-1)
                .attr("height", d => height - y(d.length/total_values))
                .attr("height_orig", d => height - y(d.length/total_values));
            rects.exit().remove();
            rects.transition()
                .duration(300)
                .attr("pct", d => d.length+'/'+total_values)
                .attr("x", d => x(d.x0))
                .attr("x_orig", d => x(d.x0))
                .attr("y", d => y(d.length/total_values))
                .attr("y_orig", d => y(d.length/total_values))
                .style('fill',d.color)
                .attr("width", d => x(d.x1)-x(d.x0)-1)
                .attr("width_orig", d => x(d.x1)-x(d.x0)-1)
                .attr("height", d => height - y(d.length/total_values))
                .attr("height_orig", d => height - y(d.length/total_values));
            rects.on("mouseenter",mouseenter)
                .on("mouseout",mouseout);
            });
    }
}

let d3Table = {
    create: function (el, data) {
        var table = d3.select(el).append("table")
            .attr("class", "table table-condensed table-hover");
        table.append("thead").append("tr");
        table.append("tbody");

        this.update(el, data);
    },

    update: function (el, data) {
        console.log('Datos tabla',data);
        var dateFormat = d3.timeFormat("%Y/%m/%d\u00A0-\u00A0%H:%M:%S");
        var columns=data.map( e => e.pid);
        var literals={'date':{short:''}};
        var tableData=[];
        columns.sort();
        columns.unshift('date');
        var dpNames = data.map(el => el.datapointname);
        var headerNames = utils.literalShortener(dpNames);
        if (headerNames) {
            data.forEach( el => {
                literals[el.pid]={'short':headerNames[el.datapointname],'title':el.datapointname};
            });
        } else {
            data.forEach( el => {
                literals[el.pid]={'short':el.datapointname};
            });
        }
        for (var i=0;i<data.length;i++) {
            for (var j=0;j<data[i].data.length;j++) {
                var tsData=tableData.find( el => el.ts == data[i].data[j].ts);
                if (!tsData) {
                    var tsObj={};
                    tsObj.ts=data[i].data[j].ts;
                    tsObj.date=dateFormat(new Date(tsObj.ts*1000));
                    tsObj[data[i].pid]=data[i].data[j].value;
                    tableData.push(tsObj);
                } else {
                    tsData[data[i].pid]=data[i].data[j].value;
                }
            }
        }
        tableData.sort( (a,b) => b.ts-a.ts);
        var table = d3.select(el).select("table"),
            tbody = table.select("tbody");
        // append the header row
        var thead = table.select('thead').select("tr")
            .selectAll("th")
            .data(columns);
        thead.enter()
            .append("th")
            .attr("class", (column,i) => {if (columns.length > 2 && i>0) {return 'text-right'}})
            .attr("title", column => literals[column].title)
            .text(column => literals[column].short);
        // create a row for each object in the data
        var rows = tbody.selectAll("tr")
            .data(tableData, d => d.ts);
        rows.enter()
            .append("tr");
        rows.exit().remove();
        var rows = tbody.selectAll("tr")
            .data(tableData, d => d.ts);
        // create a cell in each row for each column
        var cells = rows.selectAll("td")
            .data(function(row) {
                return columns.map( function(column,i) {
                    if (i>0) {
                        if (row[column] !== undefined) {
                            var value = d3.format(',')(row[column]);
                        } else {
                            var value = undefined;
                        }
                        if (columns.length > 2) {
                            return {column: column, value: value, class:'text-right'};
                        } else {
                            return {column: column, value: value};
                        }
                    } else {
                        return {column: column, value: row[column]};
                    }
                });
            });
        cells.enter()
            .append("td")
            .attr("class", d => d.class)
            .text(d => d.value);
        console.log('cells',cells);
        cells.transition()
            .duration(300)
            .text(d => d.value);
        console.log('llego al final');
        cells.exit().remove();
        thead.exit().remove();
    }
}

let d3SummaryLinegraph = {
    create: function (el, datapoints, its, ets) {
        var y_values_array=[];
        for (var i=0, j=datapoints.length; i<j; i++) {
            datapoints[i].id=i;
            y_values_array.push(d3.min(datapoints[i].data, d => d[1]));
            y_values_array.push(d3.max(datapoints[i].data, d => d[1]));
        }
        var bisectDate = d3.bisector( d => d[0]).left;
        var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
        var formatCount = d3.format(",.0f");
        var formatPercent = d3.format(",.1f");
        var margin = {top: 0, right: 0, bottom: 40, left: 0},
            height = 200 - margin.top - margin.bottom,
            width=d3.select(el).node().getBoundingClientRect().width-margin.left;
        var x = d3.scaleTime()
            .range([0, width])
            .domain([new Date(its*1000),new Date(ets*1000)]);
        var yDomain=d3.extent(y_values_array);
        var yMargin=(yDomain[1]-yDomain[0])*0.1;
        if (yMargin==0) {
            yMargin=1
        }
        var y = d3.scaleLinear()
            .domain([yDomain[0]-yMargin,yDomain[1]+yMargin])
            .rangeRound([height, 0]);
        // function for the y grid lines
        function make_y_axis() {
            return d3.axisRight(y)
            .tickSize(width, 0, 0)
            .ticks(4,",f");
        }
        function adjust_y_axis_text(selection) {
            selection.selectAll('.y-axis text')
            .attr('transform', 'translate(0,-5)');
        }
        var xAxis = d3.axisBottom(x)
            .ticks(3)
            .tickFormat(customTimeFormat);
        var yAxis = d3.axisRight(y)
            .ticks(4,",f");
        var svg = d3.select(el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var line = d3.line()
            .x( d => x(new Date(d[0]*1000)))
            .y( d => y(d[1]));
        svg.selectAll('.line')
            .data(datapoints)
            .enter()
            .append('path')
            .style('fill','none')
            .style('stroke', d => d.color)
            .style('stroke-width','3')
            .style('stroke-linecap','round')
            .attr('class','line')
            .attr('d', d => line(d.data));

        // Draw the y Grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(make_y_axis()
            .tickSize(width, 0, 0)
            );
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + height + ")")
            .style('shape-rendering','crispEdges')
            .call(xAxis);
        svg.append("g")
            .attr("class", "y-axis")
            .style('shape-rendering','crispEdges')
            .call(yAxis)
            .call(adjust_y_axis_text);

        var focus = svg.selectAll(".focus")
            .data(datapoints)
            .enter()
            .append("g")
            .attr("class", "focus")
            .attr("id", d => "dp-"+d.id)
            .style("opacity", 0);

        focus.append("circle")
            .attr("r", 4,5)
            .attr("fill", 'white')
            .style('stroke', d => d.color);

        focus.append("rect")
            .attr("x", 5)
            .attr("y", 4)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", d => d.color);

        focus.append("text")
            .attr("x", 12)
            .attr("y", 12)
            .attr("dy", ".5em")
            .style('fill','#444');

        var dateTooltip = svg.append('g')
            .attr('class', 'date-tooltip')
            .style('opacity', 0);

        dateTooltip.append("rect")
            .attr("x", 0)
            .attr("y", height+10)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltip.append("text")
            .attr("x", 12)
            .attr("y", height+20)
            .attr("dy", ".4em")
            .style('fill','#444');

        dateTooltip.append("line")
            .attr('x1',0)
            .attr('x2',0)
            .attr('y1',0)
            .attr('y2',height)
            .attr('stroke', '#aaa');

        if (datapoints.length>1) {
            var nameLength=d3.max(datapoints, d => d.datapointname ? d.datapointname.length*8 : 0);
            var numDatapoints=datapoints.length;
            if (nameLength) {
                var dpNames = datapoints.map(d => d.datapointname);
                var summaryNames = utils.literalShortener(dpNames);
                var nameLength=d3.max(dpNames, d => summaryNames[d] ? summaryNames[d].length*8 : 0);
                var rectWidth=12;
                if (nameLength > width/2 - rectWidth) {
                    nameLength = width/2 - rectWidth;
                }
                var numChars = parseInt(nameLength/8);
                var rectX = 10;
                var captionBox = svg.append("g")
                    .attr("class", "caption-box")
                    .style("opacity", 0.8);

                captionBox.append("rect")
                    .attr("x", rectX + 10)
                    .attr("y", 10 )
                    .attr("width", nameLength + 25)
                    .attr("height", numDatapoints * 20 + 15)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .style("fill", "white")
                    .style("stroke", "#ccc");

                var nameCaption = captionBox.selectAll(".name-caption")
                    .data(datapoints)
                    .enter()
                    .append("g")
                    .attr("class", "name-caption");

                nameCaption.append("rect")
                    .attr("x", rectX + 15)
                    .attr("y", (d,i) => (i+1)*20)
                    .attr("width", rectWidth)
                    .attr("height", 12)
                    .attr("rx", 3)
                    .attr("ry", 3)
                    .style("fill", d => d.color);

                nameCaption.append("text")
                    .attr("x", rectX + rectWidth + 25)
                    .attr("y", (d,i) => (i+1)*20)
                    .attr('dy','0.71em')
                    .attr('text-anchor','start')
                    .style('fill','#444')
                    .text( d => summaryNames[d.datapointname].slice(-numChars));
            }
        }

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .on("mouseenter", () => {
                d3.select(el).select('.caption-box')
                    .transition()
                    .duration(300)
                    .style('opacity', 0)
                d3.select(el).select('.x-axis')
                    .selectAll('.tick')
                    .transition()
                    .duration(300)
                    .style('opacity', 0);
                d3.select(el)
                    .selectAll(".focus")
                    .transition()
                    .duration(300)
                    .style('opacity', 1);
                d3.select(el)
                    .selectAll(".focus")
                    .selectAll("rect")
                    .transition()
                    .duration(300)
                    .style('opacity', 0.4);
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(300)
                    .style('opacity', 0.6);
                svg.selectAll('.line')
                    .transition()
                    .duration(300)
                    .style('stroke-width','2');
             })
            .on("mouseleave", () => {
                d3.select(el).select('.caption-box')
                    .transition()
                    .duration(300)
                    .style('opacity', 0.8)
                d3.select(el).select('.x-axis')
                    .selectAll('.tick')
                    .transition()
                    .duration(300)
                    .style('opacity', 1);
                d3.select(el)
                    .selectAll(".focus")
                    .transition()
                    .duration(100)
                    .style('opacity', 0);
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(100)
                    .style('opacity', 0);
                svg.selectAll('.line')
                    .transition()
                    .duration(100)
                    .style('stroke-width','3');
             })
            .on("mousemove",mousemove);

        function mousemove() {
            var xPos=d3.mouse(this)[0];
            var date=x.invert(xPos);
            var x0 = date.getTime()/1000;
            var dateText=dateFormat(date);
            var dateRectWidth=(dateText.length+1)*8;
            var xOffset=xPos<dateRectWidth/2 ? -xPos : xPos+dateRectWidth/2 > width ? width-xPos-dateRectWidth : -dateRectWidth/2;
            var yOffset = 0;
            d3.select(el).select('.date-tooltip')
                .attr('transform', 'translate('+xPos+',0)');
            d3.select(el).select('.date-tooltip')
                .select('text')
                .attr('transform', 'translate('+xOffset+',0)')
                .text(dateText);
            d3.select(el).select('.date-tooltip')
                .select('rect')
                .attr('transform', 'translate('+xOffset+',0)')
                .attr('width',dateRectWidth);
            var dpBanners = [];
            for (var j=0;j<datapoints.length;j++) {
                var i = bisectDate(datapoints[j].data, x0,1);
                i=i<1 ? 1 : i==datapoints[j].data.length ? datapoints[j].data.length -1 : i;
                if (datapoints[j].data.length > 1) {
                    var d0 = datapoints[j].data[i - 1],
                        d1 = datapoints[j].data[i];
                    var d = x0 - d0[0] > d1[0] - x0 ? d1 : d0;
                    var pointX=x(new Date(d[0]*1000));
                    var pointY=y(d[1]);
                    var rectWidth=(d[1].toString().length+1)*10;
                } else if (datapoints[j].data.length == 1) {
                    var d = datapoints[j].data[0];
                    var pointX=x(new Date(d[0]*1000));
                    var pointY=y(d[1]);
                    var rectWidth=(d[1].toString().length+1)*10;
                } else {
                    var d = [1,''];
                    var pointX = -10;
                    var pointY = -10;
                    var rectWidth = 0
                }
                xOffset=pointX+rectWidth+5 > width ? width-pointX-rectWidth-5 : 0;
                dpBanners.push({id:datapoints[j].id, value:d[1], pointX:pointX, pointY:pointY, rectWidth:rectWidth, xOffset:xOffset, yOffset:yOffset});
            }
            dpBanners.sort((a,b) => b.pointY - a.pointY);
            for (var i=1, j=dpBanners.length; i<j; i++) {
                var a = dpBanners[i];
                var b = dpBanners[i-1];
                var collisionL1 = !(
                    ((a.pointY + a.yOffset + 20) < (b.pointY)) ||
                    (a.pointY > (b.pointY + b.yOffset + 20)) ||
                    ((a.pointX + a.xOffset + a.rectWidth +10) < b.pointX) ||
                    (a.pointX > (b.pointX + b.rectWidth + b.xOffset +10))
                    );
                if (collisionL1) {
                    // move to left
                    a.xOffset = -a.rectWidth;
                    if ((a.pointX + a.xOffset) < 0 ) {
                        a.xOffset = -a.pointX;
                        b.xOffset += a.rectWidth-a.pointX;
                    }
                    if ((b.pointX + b.rectWidth + 5) > width) {
                        a.xOffset += width - b.pointX - b.rectWidth - 5;
                    }
                }
                if (i>1) {
                    var c = dpBanners[i-2];
                    var collisionL2 = !(
                        ((a.pointY + a.yOffset + 20) < (c.pointY)) ||
                        (a.pointY > (c.pointY + c.yOffset + 20)) ||
                        ((a.pointX + a.xOffset + a.rectWidth) < c.pointX) ||
                        (a.pointX > (c.pointX + c.rectWidth + c.xOffset))
                        );
                    if (collisionL2) {
                        // move up
                        a.yOffset = c.pointY - a.pointY - a.yOffset -20;
                        if ((a.pointY + a.yOffset) < 0) {
                            a.yOffset = -a.pointY;
                            c.yOffset += 20 - c.pointY;
                        }
                    }
                }
            }
            for (var i=0, j=dpBanners.length; i<j; i++) {
                var dp = dpBanners[i];
                d3.select(el).select("#dp-"+dp.id)
                    .attr("transform", "translate(" + dp.pointX + "," + dp.pointY + ")");
                d3.select(el).select("#dp-"+dp.id)
                    .select("text")
                    .attr("font-size","14px")
                    .attr("font-weight","bold")
                    .attr("transform", "translate("+dp.xOffset+","+dp.yOffset+")")
                    .text(d3.format(",")(dp.value));
                d3.select(el).select("#dp-"+dp.id)
                    .select("rect")
                    .attr("transform", "translate("+dp.xOffset+","+dp.yOffset+")")
                    .attr("width", dp.rectWidth);
            }
          }
    }
}

let d3SummaryDatasource = {
    prepareLine: function (line) {
        var TABSPACES=9,
            finalLine='',
            finalIndex=1;
        for (var i = 0; i<line.length; i++) {
            if (line[i] == '\t') {
                var numSpaces=TABSPACES-finalIndex%TABSPACES;
                finalLine=finalLine.concat('\xa0'.repeat(numSpaces));
                finalIndex+=numSpaces;
            } else if (line[i] == ' ') {
                finalLine=finalLine.concat('\xa0');
                finalIndex+=1;
            } else  {
                finalLine=finalLine.concat(line[i]);
                finalIndex+=1;
            }
        }
        return finalLine;
    },

    create: function (el, datasource, ts) {
        var expanded = false;
        var dsLines = datasource.content.split('\n');
        var margin = {top: 10, right: 0, bottom: 0, left: 0};
        var textMargin = {top: 10};
        var height = dsLines.length*20.4 + textMargin.top;
        if (expanded == false && height > 200) {
            height = 200;
        }
        var width=d3.select(el).node().getBoundingClientRect().width-margin.left;
        var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
        var date=new Date(ts*1000);
        var dateText=dateFormat(date);
        var dateWidth=dateText.length*8;
        var dateHeight=20;
        var dateX=width/2-dateWidth/2;
        var dateY=10;
        if (height >= 200) {
            var overlayClass = "overlay cursor-pointer";
        } else {
            var overlayClass = "overlay";
        }

        var svg = d3.select(el).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("rect")
            .attr("class", "content-rect")
            .attr("x", 0 )
            .attr("y", 0 )
            .attr("width", width)
            .attr("height", height)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", "white")
            .style("stroke", "#ccc");

        svg.selectAll('.ds-line')
            .data(dsLines)
            .enter()
            .append("text")
            .attr("class", 'ds-line')
            .attr("x", 5)
            .attr("y", (d,i) => i*20.4+14+textMargin.top)
            .style('fill','#444')
            .text( d => this.prepareLine(d));

        var dateTooltip = svg.append('g')
            .attr('class', 'date-tooltip')
            .style('opacity', 1);

        dateTooltip.append("rect")
            .attr("x", dateX)
            .attr("y", dateY)
            .attr("width", dateWidth)
            .attr("height", dateHeight)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltip.append("text")
            .attr("x", dateX+10)
            .attr("y", dateY+10)
            .attr("dy", ".4em")
            .style('fill','#444')
            .text(dateText);

        svg.append("rect")
            .attr("class", overlayClass)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .on("mouseenter", () => {
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(300)
                    .style('opacity', 0);
             })
            .on("mouseleave",() => {
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(100)
                    .style('opacity', 1);
             })
            .on("click",() => {
                expanded=!expanded;
                this.update(el, datasource, ts, expanded)
            });
    },

    update: function (el, datasource, ts, expanded) {
        var dsLines = datasource.content.split('\n');
        var margin = {top: 10, right: 0, bottom: 0, left: 0};
        var textMargin = {top: 10};
        var height = dsLines.length*20.4 +textMargin.top;
        if (expanded == false && height > 200) {
            height = 200;
        }
        var width=d3.select(el).node().getBoundingClientRect().width-margin.left;
        if (width == 0) {
            return;
        }
        var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
        var date=new Date(ts*1000);
        var dateText=dateFormat(date);
        var dateWidth=dateText.length*8;
        var dateHeight=20;
        var dateX=width/2-dateWidth/2;
        var dateY=10;
        if ( height >= 200) {
            var overlayClass = "overlay cursor-pointer";
        } else {
            var overlayClass = "overlay";
        }

        d3.select(el)
            .select("svg")
            .transition()
            .duration(300)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var svg = d3.select(el)
            .select("svg")
            .select("g");

        svg.select(".content-rect")
            .transition()
            .duration(300)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll('.ds-line')
            .data(dsLines)
            .enter()
            .append("text")
            .attr("class", 'ds-line')
            .attr("x", 5)
            .attr("y", (d,i) => i*20.4+14+textMargin.top)
            .style('fill','#444')
            .text( d => this.prepareLine(d));

        var dateTooltip = svg.select('.date-tooltip').remove();

        var dateTooltip = svg.append('g')
            .attr('class', 'date-tooltip')
            .style('opacity', 0);

        dateTooltip.append("rect")
            .attr("x", dateX)
            .attr("y", dateY)
            .attr("width", dateWidth)
            .attr("height", dateHeight)
            .attr("rx", 5)
            .attr("ry", 5)
            .style("fill", '#eee')
            .style("stroke", '#ccc');

        dateTooltip.append("text")
            .attr("x", dateX+10)
            .attr("y", dateY+10)
            .attr("dy", ".4em")
            .style('fill','#444')
            .text(dateText);

        svg.selectAll('.overlay')
            .remove();

        svg.append("rect")
            .attr("class", overlayClass)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .on("mouseenter",() => {
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(300)
                    .style('opacity', 0);
             })
            .on("mouseleave",() => {
                d3.select(el).select('.date-tooltip')
                    .transition()
                    .duration(100)
                    .style('opacity', 1);
             })
            .on("click",() => {
                expanded=!expanded;
                this.update(el, datasource, ts, expanded)
            });
    }
}

export {
    d3TimeSlider,
    d3Linegraph,
    d3Histogram,
    d3Table,
    d3SummaryLinegraph,
    d3SummaryDatasource
}

