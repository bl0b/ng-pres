(function() {

    function opt_attr(e, a, d)
    {
        attr = e[0].attributes;
        return attr[a] ? attr[a].value : d;
    }

    function get_value(dim) {
        l = dim.length;
        if (dim[l - 1] == 'x' && dim[l - 2] == 'p') {
            return Number(dim.substr(0, l - 2));
        }
    }

    function parse_step(str) {
        var steps = str.split('-');
        steps[0] = Math.max(0, Number(steps[0]) - 1);
        if (steps.length > 1) {
            steps[1] = steps[1].length > 0 ? Number(steps[1]) - 1 : Math.pow(2, 53) - 1;
            steps[1] = Math.max(steps[0], steps[1]);
        } else {
            steps.push(steps[0]);
        }
        return steps;
    }

    function parse_steps(str) {
        return str.split(',').filter(function(x) { return x != ''; }).map(parse_step);
    }

    function steps_to_str(steps) {
        return '[' + steps.map(function(x) { return '[' + x + ']'; }) + ']';
    }


/* Copied from Angular source (angular.js +1794) */
/**
 * Return the DOM siblings between the first and last node in the given array.
 * @param {Array} array like object
 * @returns {Array} the inputted object or a jqLite collection containing the nodes
 */
function getBlockNodes(nodes) {
  // TODO(perf): update `nodes` instead of creating a new object?
  var node = nodes[0];
  var endNode = nodes[nodes.length - 1];
  var blockNodes;

  for (var i = 1; node !== endNode && (node = node.nextSibling); i++) {
    if (blockNodes || nodes[i] !== node) {
      if (!blockNodes) {
        blockNodes = jqLite(slice.call(nodes, 0, i));
      }
      blockNodes.push(node);
    }
  }

  return blockNodes || nodes;
}

src_urls = {};

var app = angular.module('ngPres', ['hljs'])
.run(function($templateCache) {
    $templateCache
        .put("toc-item.html",
             `{{item.title}}
             <div class="slide-bullets">
                 <span ng-class="['slide-bullet', {'slide-bullet-active': s == $parent.current_slide}]"
                       ng-repeat="s in item.slides">{{s == $parent.current_slide ? slideBulletActive : slideBullet}}</span>
             </div>
             <ul class="toc" ng-if="item.children.length > 0">
                 <li ng-class="['toc-item', {'current-toc-item': item.slides.indexOf($parent.current_slide) != -1}]"
                     ng-repeat="item in item.children">
                     <ng-include src="'toc-item.html'"></ng-include>
                 </li>
             </ul>
            `);
/*
    $templateCache
        .put("presentation.html",
             `
             <adjustbox maintain-aspect style="width: 100%; height: 100%;">
             <table class="presentation">
                <tbody>
                  <tr><td class="header" colspan="3" ng-transclude="header"></td></tr>
                  <tr>
                    <td class="left-sidebar" ng-transclude="leftSidebar"></td>
                    <td class="slide" ng-transclude></td>
                    <td class="right-sidebar" ng-transclude="rightSidebar"></td>
                  </tr>
                  <tr><td class="footer" colspan="3" ng-transclude="footer">
                  </td></tr>
              </table>
              </adjustbox>
             `);
    $templateCache
        .put("presentation.html", '<adjustbox maintain-aspect style="width: 100%; height: 100%;"><ng-transclude/></adjustbox>');
    $templateCache
        .put("frame.html",
             `
             <div ng-class="{'hidden': slide_index != current_slide}">
              <!-- <adjustbox maintain-aspect style="width: 100%; height: 100%;"> -->
                 <table class="presentation">
                   <tbody>
                     <tr><td class="header" colspan="3"><div class="header" ng-bind-html="header()"></div></td></tr>
                     <tr>
                       <td class="left-sidebar"><div class="left-sidebar" ng-bind-html="leftSidebar()"></div></td>
                       <td class="slide"><div class="slide" ng-transclude></div></td>
                       <td class="right-sidebar"><div class="right-sidebar" ng-bind-html="rightSidebar()"></div></td>
                     </tr>
                     <tr><td class="footer" colspan="3"><div class="footer" ng-bind-html="footer()"></div></td></tr>
                   </tbody>
                 </table>
               <!-- </adjustbox> -->
             </div>
             `);
    $templateCache
        .put("section.html", '<enter-section title="{{title}}"/><ng-transclude/><leave-section/>');
//*/
})

.directive('presentation', ['$document', '$rootScope', '$sce', function($document, $rootScope, $sce) {
    return {
        restrict: 'E',
        /*transclude: {*/
            /*'header': '?header',*/
            /*'leftSidebar': '?leftSidebar',*/
            /*'rightSidebar': '?rightSidebar',*/
            /*'footer': '?footer'*/
        /*},*/
        transclude: true,
        //templateUrl: "presentation.html", //'<div class="presentation"><ng-transclude></ng-transclude></div>',
        template: '<adjustbox maintain-aspect style="width: 100%; height: 100%;"><ng-transclude/></adjustbox><div class="hidden" id="to_print">{{setup_print()}}</div>',
        link: function(scope, element, attr) {
            /*console.log('setting up keydown event callback');*/
            $document.bind('keydown', function(e) {
                /*console.log('Got keydown:', e.keyCode);*/
                $rootScope.$broadcast('keydown', e);
                $rootScope.$broadcast('keydown:' + e.keyCode, e);
                /*scope.$digest();*/
            });

            scope.all_footer = element.find('footer');
            scope.footer = function() { return $sce.trustAsHtml(scope.all_footer.html()); };

            scope.all_header = element.find('header');
            scope.header = function() { return $sce.trustAsHtml(scope.all_header.html()); };

            scope.all_leftSidebar = element.find('left-sidebar');
            scope.leftSidebar = function() { return $sce.trustAsHtml(scope.all_leftSidebar.html()); };

            scope.all_rightSidebar = element.find('right-sidebar');
            scope.rightSidebar = function() { return $sce.trustAsHtml(scope.all_rightSidebar.html()); };

            scope.all_slides = element.find('slide');
        },
        /*link: {*/
            /*pre: function(scope, element, attr, controller) {*/
                /*scope.tocHilight = attr.tocHilight;*/
            /*}*/
        /*},*/
        controller: ['$scope', '$element', '$location', function($scope, $element, $location) {
            console.log($element);
            $scope.slideBullet = opt_attr($element, 'slide-bullet', '');
            $scope.slideBulletActive = opt_attr($element, 'slide-bullet-active', '');
            $scope.talk_author = opt_attr($element, 'author', '');
            $scope.talk_date = opt_attr($element, 'date', '');
            $scope.talk_where = opt_attr($element, 'where', '');
            $scope.debug_adjustbox = $element[0].attributes['debug-adjustbox'] !== undefined;
            /*attr = $element[0].attributes;*/
            /*$scope.slideBullet = attr['slide-bullet'].value;*/
            /*$scope.slideBulletActive = attr['slide-bullet-active'].value;*/
            $scope.current_slide = 0;
            $scope.current_step = 0;
            $scope.global_step = 0;
            $scope.slide_count = 0;
            $scope.steps_by_slide = [];
            $scope.TOC = {title:'', slides: [], children: []};

            var hash = $location.hash(),
                parts = hash.split(':').map(Number);
            if (parts.length == 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                $scope.current_slide = parts[0];
                $scope.current_step = parts[1];
                $scope.global_step = 1 + $scope.current_step;
                for (var i = 0; i <= $scope.current_slide; ++i) {
                    $scope.global_step += 1 + $scope.steps_by_slide[i];
                }
            }

            $scope.next_slide = function() {
                if ($scope.current_slide < ($scope.slide_count - 1)) {
                    /*console.log('next slide!');*/
                    $scope.current_slide += 1;
                }
            };

            $scope.previous_slide = function() {
                if ($scope.current_slide > 0) {
                    /*console.log('previous slide!');*/
                    $scope.current_slide -= 1;
                }
            };

            $scope.previous_step = function() {
                if ($scope.current_step > 0) {
                    $scope.current_step -= 1;
                    $scope.global_step -= 1;
                } else if ($scope.current_slide > 0) {
                    $scope.current_slide -= 1;
                    $scope.current_step = $scope.steps_by_slide[$scope.current_slide];
                    $scope.global_step -= 1;
                }
                $location.hash($scope.current_slide + ':' + $scope.current_step);
            };

            $scope.next_step = function() {
                if ($scope.current_step < $scope.steps_by_slide[$scope.current_slide]) {
                    $scope.current_step += 1;
                    $scope.global_step += 1;
                } else if ($scope.current_slide < ($scope.slide_count - 1)) {
                    $scope.current_step = 0;
                    $scope.current_slide += 1;
                    $scope.global_step += 1;
                }
                $location.hash($scope.current_slide + ':' + $scope.current_step);
            };
            
            var single_slide = opt_attr($element, 'single-slide', '').split(':').map(Number);
            if (single_slide.length == 2) {
                $scope.current_slide = single_slide[0];
                $scope.current_step = single_slide[1];
            } else {
                $scope.$on('keydown:37', function(onEvent, keypressEvent) {
                    $scope.$apply($scope.previous_step());
                });
                $scope.$on('keydown:39', function(onEvent, keypressEvent) {
                    $scope.$apply($scope.next_step());
                });
            }

            $scope.match_step = function(steps) {
                return steps.filter(function(range) { return range[0] <= $scope.current_step && range[1] >= $scope.current_step; }).length > 0;
            };
            
            $scope.match_slide = function(slide_index) {
                return slide_index == $scope.current_slide;
            };

            this.match_step = function(steps) { return $scope.match_step(steps); };

            this.current_slide = function() { return $scope.current_slide; };

            this.slide_count = function() { return $scope.slide_count; };

            this.section_stack = [$scope.TOC];

            this.current_section = function() { return this.section_stack[this.section_stack.length - 1]; };

            this.enter_section = function(title) {
                console.log("ENTER SECTION " + title);
                var section = {title: title, slides: [], children: []};
                this.current_section().children.push(section);
                this.section_stack.push(section);
            };

            this.leave_section = function() {
                console.log("LEAVE SECTION " + this.current_section().title);
                this.section_stack.pop();
            };
            
            this.add_slide = function() {
                var ret = $scope.slide_count;
                $scope.slide_count += 1;
                this.current_section().slides.push(ret);
                /*$scope.all_steps.push([ret, 0]);*/
                $scope.steps_by_slide[ret] = 0;
                console.log("ADD SLIDE... IN ", this.current_section());
                return ret;
            };

            this.ensure_steps = function(steps) {
                var max = 0;
                for (var i = 0; i < steps.length; ++i) {
                    if (steps[i][0] > max) {
                        max = steps[i][0];
                    }
                }
                if ($scope.steps_by_slide[$scope.slide_count - 1] < max) {
                    $scope.steps_by_slide[$scope.slide_count - 1] = max;
                }
                $scope.step_count = 0;
                for (var i = 0; i < $scope.steps_by_slide.length; ++i) {
                    $scope.step_count += 1 + $scope.steps_by_slide[i];
                }
                /*console.log("ensure_steps///steps_by_slide", $scope.steps_by_slide, $scope.step_count);*/
            }

            this.get_toc = function() { /*console.log('get_toc'); console.log($scope.TOC);*/ return $scope.TOC; };
            console.log($scope);
        }]
    };
}])
.directive('renderToc', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: true,
        link: function(scope, element, attr, presentation) {
            scope.currentClass = attr.currentClass;
        },
        template: '<div ng-repeat="item in [$parent.TOC]" ng-include="\'toc-item.html\'"></div>'
    };
})
/*
.directive('enterSection', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: {title:"@"},
        link: function(scope, element, attr, presentation) {
            presentation.enter_section(attr.title);
        },
        template: ''
    };
})
.directive('leaveSection', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        link: function(scope, element, attr, presentation) {
            presentation.leave_section();
        },
        template: ''
    };
})
//*/
.directive('section', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        transclude: true,
        scope: {title:"@"},
/*
        templateUrl: 'section.html',
/*/
        link: {
            pre: function(scope, element, attr, presentation) {
                presentation.enter_section(attr.title);
            },
            post: function(scope, element, attr, presentation) {
                presentation.leave_section();
            },
        },
        template: '<ng-transclude/>',
//*/
    };
})
.directive('slide', function() {
    return {
        restrict: 'E',
        transclude: true,
        require: '^presentation',
        /*priority: 700,*/
        scope: true,
        link: {
            pre: function(scope, element, attr, presentation) {
                console.log("ENTERING SLIDE LINK");
                scope.slide_index = presentation.add_slide();
                /*scope.current_slide = function() { return presentation.current_slide(); };*/
                console.log("LINKED SLIDE #" + scope.slide_index);
                presentation.ensure_steps(scope.slide_index, []);
            },
        },
        /*controller: function() {},*/
        /*template: '<div ng-class="[\'slide\', {\'hidden\': slide_index != current_slide()}]" ng-transclude></div>'*/
        /*templateUrl: 'frame.html'*/
        template: `
             <div ng-class="{'hidden': !match_slide(slide_index)}">
               <table class="presentation">
                 <tbody>
                   <tr><td class="header" colspan="3"><div class="header" ng-bind-html="header()"></div></td></tr>
                   <tr>
                     <td class="left-sidebar"><div class="left-sidebar" ng-bind-html="leftSidebar()"></div></td>
                     <td class="slide"><div class="slide" ng-transclude></div></td>
                     <td class="right-sidebar"><div class="right-sidebar" ng-bind-html="rightSidebar()"></div></td>
                   </tr>
                   <tr><td class="footer" colspan="3"><div class="footer" ng-bind-html="footer()"></div></td></tr>
                 </tbody>
               </table>
             </div>
             `
    };
})
.directive('visible', ['$animate', function($animate) {
    /* Copied and lightly adapted from the source of ng-if */
  return {
    multiElement: true,
    transclude: 'element',
    priority: 600,
    /*terminal: true,*/
    scope: false,
    restrict: 'A',
    require: '^presentation',
    $$tlb: true,
    link: function($scope, $element, $attr, ctrl, $transclude) {
        /*console.log("ENTERING VISIBLE LINK");*/
        var block, childScope, previousElements;
        var steps = parse_steps($attr.visible);
        ctrl.ensure_steps(steps);
        $scope.$watch(
            function() {
                var ret = ctrl.match_step(steps);
                /*console.log("watch visible", steps, ret);*/
                return ret;
            },
            function visibleWatchAction(value) {
                if (value) {
                    if (!childScope) {
                        $transclude(function(clone, newScope) {
                            childScope = newScope;
                            clone[clone.length++] = document.createComment(' end visible: ' + $attr.visible + ' ');
                            // Note: We only need the first/last node of the cloned nodes.
                            // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                            // by a directive with templateUrl when its template arrives.
                            block = {
                                clone: clone
                            };
                            $animate.enter(clone, $element.parent(), $element);
                        });
                    }
                } else {
                    if (previousElements) {
                        previousElements.remove();
                        previousElements = null;
                    }
                    if (childScope) {
                        childScope.$destroy();
                        childScope = null;
                    }
                    if (block) {
                        previousElements = getBlockNodes(block.clone);
                        $animate.leave(previousElements).then(function() {
                            previousElements = null;
                        });
                        block = null;
                    }
                }
            });
    }
  };
}])
.directive('progressBar', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        link: function(scope, element, attr) {
            scope.use_step = attr.granularity === 'step';
        },
        template: '<div class="progress-bar"><div class="progress-bar-inner" style="width: {{100 * ((use_step ? $parent.global_step : $parent.current_slide) + 1) / (use_step ? $parent.step_count : $parent.slide_count)}}%;"></div></div>'
    };
})
.directive('block', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {title: '@'},
        template: `
            <div class="block">
                <div class="block-title"><h1>{{title}}</h1></div>
                <div class="block-content" ng-transclude></div>
            </div>
        `
    };
})
.directive('slideCounter', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        link: function(scope, element, attr) {
            scope.use_step = attr.granularity === 'step';
        },
        template: '<p class="slide-counter">{{(use_step ? $parent.global_step : $parent.current_slide) + 1}}&nbsp;/&nbsp;{{use_step ? $parent.step_count : $parent.slide_count}}</p>'
    };
})
.directive('talkAuthor', function() { return { restrict: 'E', require: '^presentation', template: '<span class="talk-author">{{$parent.talk_author}}</span>' }; })
.directive('talkWhere', function() { return { restrict: 'E', require: '^presentation', template: '<span class="talk-where">{{$parent.talk_where}}</span>' }; })
.directive('talkDate', function() { return { restrict: 'E', require: '^presentation', template: '<span class="talk-date">{{$parent.talk_date}}</span>' }; })
.directive('defaultFooter', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: true,
        template: `
            <div style="text-align: center; width: 100%;">
                <div style="display: inline-block; float: left; padding-left: 1em; padding-right: 1em;"><talk-date/></div>
                <div style="display: inline-block; float: left; padding-left: 1em; padding-right: 1em;"><talk-where/></div>
                <div style="display: inline-block; float: right; padding-left: 1em; padding-right: 1em;"><slide-counter/></div>
                <talk-author/>
            </div>
            `
            /*'<table class="presentation"><tbody><tr><td style="text-align:left;"><date/>&nbsp;<event/></td><td style="text-align:center;"><author/></td><td style="text-align:right;"><slide-counter/></td></tr></tbody></table>'*/
    };
})

/*.directive('huge', function() { return { restrict: 'AE', scope: true, transclude: true, template: '<span class="huge" ng-transclude></span>' }; })*/
/*.directive('big', function() { return { restrict: 'AE', scope: true, transclude: true, template: '<span class="big" ng-transclude></span>' }; })*/
/*.directive('normal', function() { return { restrict: 'AE', scope: true, transclude: true, template: '<span class="normal" ng-transclude></span>' }; })*/
/*.directive('small', function() { return { restrict: 'AE', scope: true, transclude: true, template: '<span class="small" ng-transclude></span>' }; })*/
/*.directive('tiny', function() { return { restrict: 'AE', scope: true, transclude: true, template: '<span class="tiny" ng-transclude></span>' }; })*/

.directive('adjustbox', function() {
    return {
        restrict: 'E',
        transclude: true,
        link: function(scope, element, attr) {
            scope.maintain_aspect = element[0].attributes['maintain-aspect'] !== undefined;
            scope.style = attr.style;
            scope.class = attr.class;
            /*console.log("ADJUSTBOX\n", element, attr, scope);*/
            scope.scale_x = scope.scale_y = 1;
            scope.translate_x = scope.translate_y = 0;
            scope.$watch(function () {
                maindiv = element[0].children[0];
                contents = maindiv.children[0].children[0];
                ow = maindiv.clientWidth;
                oh = maindiv.clientHeight;
                iw = contents.clientWidth;
                ih = contents.clientHeight;
                return [ow/iw, oh/ih, iw, ih];
            }, function(new_val, old_val) {
                /*console.log("WATCH!\n", new_val);*/
                if (scope.maintain_aspect) {
                    if (new_val[0] < new_val[1]) {
                        scope.scale_x = scope.scale_y = new_val[0];
                        scope.translate_x = 0;
                        scope.translate_y = new_val[3] * (new_val[1] - new_val[0]) * .5;
                    } else {
                        scope.scale_x = scope.scale_y = new_val[1];
                        scope.translate_x = new_val[2] * (new_val[0] - new_val[1]) * .5;
                        scope.translate_y = 0;
                    }
                } else {
                    scope.scale_x = new_val[0];
                    scope.scale_y = new_val[1];
                    scope.translate_x = scope.translate_y = 0;
                }
            }, true);
        },
        template: `
            <div class="{{class}}" style="align: center; overflow: hidden; position: relative; padding: {{debug_adjustbox ? '-1px' : '0'}}; border: {{debug_adjustbox ? '1px solid rgba(255,0,0,.5)' : '0'}}; {{style}}"><!-- positioning container -->
                <div style="transform-origin: 0 0; transform: translate({{translate_x}}px, {{translate_y}}px) scale({{scale_x}}, {{scale_y}}); position: absolute; width: 100vw; height: 100vh; overflow: hidden;"><!-- resizing container -->
                    <div style="display: inline-block;" ng-transclude></div>
                </div>
                <pre ng-if="debug_adjustbox" style="position: absolute; top: 0; left: 0; border: 0; background: rgba(128, 128, 128, .7); padding: 0 2px; margin: 0;">scale({{scale_x.toFixed(2)}}, {{scale_y.toFixed(2)}}) +{{translate_x.toFixed(2)}},{{translate_y.toFixed(2)}}</pre>
            </div>`
    };
})

.directive('header', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('footer', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('leftSidebar', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('rightSidebar', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
;
})()
