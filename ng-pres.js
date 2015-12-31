(function() {

    function is_module_defined(module_name) {
        try { angular.module(module_name) } catch(err) { return false; }
        return true;
    }

    function trim_hidden(nodes) {
        /*console.log("trim_hidden", nodes);*/
        for (var i = nodes.length - 1; i >= 0; --i) {
            /*console.log("on node #" + i, nodes[i]);*/
            var style = nodes[i].style;
            var classes = nodes[i].className !== undefined ? nodes[i].className.split(' ') : [];
            if (style === undefined) {
                continue;
            } 
            var ok = (style.visibility == 'hidden' || style.display == 'none')
                     || classes.indexOf('hidden') != -1;
            if (ok) {
                /*console.log(nodes[i], nodes[i].className, nodes[i].parentNode);*/
                nodes[i].parentNode.removeChild(nodes[i]);
                /*console.log("removing node #" + i, nodes[i]);*/
            } else if (nodes[i].childNodes !== undefined) {
                trim_hidden(nodes[i].childNodes); }
        }
    }

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


/* Copied from Angular source (angular.js +1794), dependency of ng-if (visible) */
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


var TocEntry = function TocEntry(title) {
    this.title = title;
    this.slides = [];
    this.children = [];
    this.own_slide = -1;
    this.state = 'inactive-toc-item';
};

TocEntry.prototype = {
    add_slide: function(s) { this.slides.push(s); },
    contains: function(s) {
        return this.own_slide == s || this.slides.indexOf(s) != -1;
    },
    child_contains: function(s) {
        /*console.log("contains " + s + "?", this);*/
        /*if (this.slides.indexOf(s) != -1) {*/
            /*return true;*/
        /*}*/
        for (var i = 0; i < this.children.length; ++i) {
            if (this.children[i].contains(s) ||  this.children[i].child_contains(s)) {
                return true;
            }
        }
        return false;
    },
    add_child: function(c) { this.children.push(c); },
    first_slide: function(c) {
        if (this.slides.length == 0) {
            if (this.children.length > 0) {
                return this.children[0].first_slide();
            }
            return undefined;
        } else if (this.children.length > 0) {
            return Math.min(this.slides[0], this.children[0].first_slide());
        } else {
            return this.slides[0];
        }
    },
    last_slide: function(c) {
        if (this.slides.length == 0) {
            if (this.children.length > 0) {
                return this.children[this.children.length - 1].last_slide();
            }
            return undefined;
        } else if (this.children.length > 0) {
            return Math.max(this.slides[this.slides.length - 1], this.children[this.children.length - 1].first_slide());
        } else {
            return this.slides[this.slides.length - 1];
        }
    },
    reset_state: function() {
        this.state = 'inactive-toc-item';
        for (var i = 0; i < this.children.length; ++i) {
            this.children[i].reset_state();
        }
    },
    update_state: function(cur_slide) {
        if (this.contains(cur_slide)) {
            this.state = 'active-toc-item';
            return true;
        } else if (this.first_slide() > cur_slide || this.last_slide() < cur_slide) {
            return false;
        } else {
            for (var i = 0; i < this.children.length; ++i) {
                if (this.children[i].update_state(cur_slide)) {
                    this.state = 'active-toc-item-parent';
                    return true;
                }
            }
        }
    }
};

var opt_dep = ['ngTouch'].filter(is_module_defined);


var app = angular.module('ngPres', opt_dep)
.run(function($templateCache) {
    $templateCache
        .put("toc-item.html",
             `<a ng-if="clickable" href="##{{item.first_slide()}}:0">{{item.title}}</a><span ng-if="!clickable">{{item.title}}</span>
             <div class="slide-bullets">
                 <span ng-class="['slide-bullet', {'active-slide-bullet': s == $parent.current_slide}]"
                       ng-repeat="s in item.slides">
                            <a ng-if="clickable" href="##{{s}}:0">{{s == $parent.current_slide ? slideBulletActive : slideBullet}}</a>
                            <span ng-if="!clickable">{{s == $parent.current_slide ? slideBulletActive : slideBullet}}</span>
                 </span>
             </div>
             <ul class="toc" ng-if="item.children.length > 0">
                 <!-- <li ng-class="{'current-toc-item': item.contains($parent.current_slide), 'current-toc-item-parent': item.child_contains($parent.current_slide), 'inactive-toc-item': !(item.contains($parent.current_slide) || item.child_contains($parent.current_slide))}" -->
                 <li class="{{item.state}}"
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

.directive('presentation', ['$document', '$rootScope', '$sce', '$timeout', function($document, $rootScope, $sce, $timeout) {
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
        /*template: '<adjustbox maintain-aspect style="width: 100%; height: 100%;"><ng-transclude/></adjustbox><to-print class="hidden" id="to_print" ng-bind-html="setup_print()"></to-print>',*/
        /*template: '<adjustbox maintain-aspect style="width: 100%; height: 100%;"><ng-transclude/></adjustbox><to-print/>',*/
        template: `
            <span><div ng-class="{'showcase': showcasing, 'full': !showcasing, 'hide_cursor': hide_cursor}" ng-swipe-left="next_step()" ng-swipe-right="previous_step()">
                <adjustbox maintain-aspect style="width: 100%; height: 100%;">
                    <ng-transclude/>
                </adjustbox>
            </div></span>
            <div ng-if="showcasing" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 1000;">
                <div style="position: absolute; top: 50%; left: 50%; width: 20%; height: 20%; margin-top: -10%; margin-left: -10%;">
                    <adjustbox maintain-aspect style="width: 100%; height: 100%;">
                        <h1>Preparing...</h1>
                        <progress-bar style="width: 100%;"/>
                    </adjustbox>
                </div>
            </div>
        `,
        link: {
            pre: function(scope, element, attr) {
                console.log("presentation pre link");
                scope.backup_match_slide = scope.match_slide;
                scope.match_slide = function(s) { return true; };
            },
            post: function(scope, element, attr) {
                console.log("presentation post link");
                /*console.log('setting up keydown event callback');*/
                $document.bind('keydown', function(e) {
                    /*console.log('Got keydown:', e.keyCode);*/
                    $rootScope.$broadcast('keydown', e);
                    $rootScope.$broadcast('keydown:' + e.keyCode, e);
                    /*scope.$digest();*/
                });

                scope.all_section_slide = element.find('on-section');
                scope.section_slide = function() { return $sce.trustAsHtml(scope.all_section_slide.html()); };

                scope.all_footer = element.find('slide-footer');
                scope.footer = function() { return $sce.trustAsHtml(scope.all_footer.html()); };

                scope.all_header = element.find('slide-header');
                scope.header = function() { return $sce.trustAsHtml(scope.all_header.html()); };

                scope.all_leftSidebar = element.find('slide-left-sidebar');
                scope.leftSidebar = function() { return $sce.trustAsHtml(scope.all_leftSidebar.html()); };

                scope.all_rightSidebar = element.find('slide-right-sidebar');
                scope.rightSidebar = function() { return $sce.trustAsHtml(scope.all_rightSidebar.html()); };

                scope.all_slides = element.find('slide');
                scope.match_slide = scope.backup_match_slide;
                scope.backup_match_slide = null;
                /*scope.$digest();*/

                scope.match_slide = function(slide_index) {
                    return slide_index == scope.current_slide;
                };

                scope.$slide = scope.all_slide_scopes[0];
                //$timeout(scope.$digest);
            },
        },
        /*link: {*/
            /*pre: function(scope, element, attr, controller) {*/
                /*scope.tocHilight = attr.tocHilight;*/
            /*}*/
        /*},*/
        controller: ['$scope', '$element', '$location', function($scope, $element, $location) {
            console.log($element);
            $scope.slideBullet = opt_attr($element, 'slide-bullet', '');
            $scope.slideBulletActive = opt_attr($element, 'active-slide-bullet', '');
            $scope.talk_author = opt_attr($element, 'author', '');
            $scope.talk_date = opt_attr($element, 'date', '');
            $scope.talk_where = opt_attr($element, 'where', '');
            $scope.title = opt_attr($element, 'title', '');
            $scope.subtitle = opt_attr($element, 'subtitle', '');
            $scope.debug_adjustbox = $element[0].attributes['debug-adjustbox'] !== undefined;
            $scope.hide_cursor = $element[0].attributes['hide-cursor'] !== undefined;
            /*$scope.use_section_slides = $element[0].attributes['with-section-slides'] !== undefined;*/
            /*attr = $element[0].attributes;*/
            /*$scope.slideBullet = attr['slide-bullet'].value;*/
            /*$scope.slideBulletActive = attr['active-slide-bullet'].value;*/
            $scope.current_slide = 0;
            $scope.current_step = 0;
            $scope.global_step = 0;
            $scope.slide_count = 0;
            $scope.steps_by_slide = [];
            $scope.TOC = new TocEntry('');  // {title:'', slides: [], children: []};

            $scope.showcasing = false;

            $scope.go_to_slide = function(sl, st) {
                /*console.log("go to slide", sl, st);*/
                if (sl === undefined) {
                    return;
                }
                $scope.current_slide = sl;
                $scope.current_step = st;
                $scope.global_step = $scope.current_step;
                for (var i = 0; i < $scope.current_slide; ++i) {
                    $scope.global_step += 1 + $scope.steps_by_slide[i];
                }
            };

            this.go_to_slide = function(sl, st) { $scope.go_to_slide(sl, st); };

            /*$timeout(function() {*/
            $scope.$watch(
                function() { return $location.hash(); },
                function(value) {
                    var hash = $location.hash(),
                        parts = hash.split(':').map(Number);
                    if (parts.length == 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        $scope.go_to_slide(parts[0], parts[1]);
                    }
                });

            /*$scope.$watch(function () {*/
                /*return location.hash;*/
            /*}, function (value) {*/
                /*console.log("location changed!", value);*/
            /*});*/

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
                    $rootScope.$digest();  /* ensure adjustboxes are properly computed */
                } else if ($scope.current_slide > 0) {
                    $scope.current_slide -= 1;
                    $scope.current_step = $scope.steps_by_slide[$scope.current_slide];
                    $scope.global_step -= 1;
                    $scope.TOC.update_state($scope.current_slide);
                    $scope.$slide = $scope.all_slide_scopes[$scope.current_slide];
                    $rootScope.$digest();  /* ensure adjustboxes are properly computed */
                }
                $location.hash($scope.current_slide + ':' + $scope.current_step);
            };

            $scope.next_step = function() {
                if ($scope.current_step < $scope.steps_by_slide[$scope.current_slide]) {
                    $scope.current_step += 1;
                    $scope.global_step += 1;
                    $rootScope.$digest();  /* ensure adjustboxes are properly computed */
                } else if ($scope.current_slide < ($scope.slide_count - 1)) {
                    $scope.current_step = 0;
                    $scope.current_slide += 1;
                    $scope.global_step += 1;
                    $scope.TOC.update_state($scope.current_slide);
                    $scope.$slide = $scope.all_slide_scopes[$scope.current_slide];
                    $rootScope.$digest();  /* ensure adjustboxes are properly computed */
                }
                $location.hash($scope.current_slide + ':' + $scope.current_step);
            };

            $scope.$on('keydown:37' /* left arrow */, function(onEvent, keypressEvent) {
                $scope.$apply($scope.previous_step());
            });
            $scope.$on('keydown:39' /* right arrow */, function(onEvent, keypressEvent) {
                $scope.$apply($scope.next_step());
            });
            $scope.$on('keydown:80' /* p */, function(onEvent, keypressEvent) {
                var cont = function(fn) { $timeout(fn); };
                var parts = [];
                var append = function() {
                    $rootScope.$digest();
                    var main = [$element.find('span')[0].cloneNode(true)];
                    /*console.log("main before", main);*/
                    trim_hidden(main);
                    /*console.log("main after", main);*/
                    parts.push(angular.element(main).html());
                    /*parts.push(angular.element(document.querySelector('slide > div:not(.hidden)').parent).html());*/
                    cont(next);
                };
                var backup_cs = $scope.current_step, backup_gs = $scope.global_step, backup_cl = $scope.current_slide;
                var init = function() {
                    $scope.current_step = $scope.global_step = $scope.current_slide = 0;
                    $scope.showcasing = true;
                    cont(append);
                };
                var deinit = function() {
                    $scope.current_step = backup_cs;
                    $scope.current_slide = backup_cl;
                    $scope.global_step = backup_gs;
                    $scope.showcasing = false;
                    $location.hash($scope.current_slide + ':' + $scope.current_step);
                    $rootScope.$digest();
                }
                var next = function() {
                    if (!(($scope.current_slide == $scope.slide_count - 1) && ($scope.current_step == $scope.steps_by_slide[$scope.current_slide]))) {
                        $scope.next_step();
                        cont(append);
                    } else {
                        var w = window.open();
                        w.document.write('<html><head>');
                        w.document.write(angular.element(document.head).html());
                        w.document.write('</head><body class="presentation-preview">');
                        w.document.write(parts.join(''));
                        w.document.write('</body></html>');
                        w.document.close();
                        cont(deinit);
                    }
                };
                cont(init);
            });

            $scope.all_slides = [];
            $scope.all_slide_scopes = [];

            $scope.match_step = function(steps) {
                return steps.filter(function(range) { return range[0] <= $scope.current_step && range[1] >= $scope.current_step; }).length > 0;
            };

            $scope.match_slide = function(slide_index) {
                return true;  // slide_index == $scope.current_slide;
            };

            $scope.on_section = false;
            $scope.on_section_slides = [];
            $scope.is_on_section_slide = function() {
                return $scope.on_section_slides.indexOf($scope.current_slide) != -1;
            };

            this.set_onSection = function() { $scope.on_section = true; };

            this.match_step = function(steps) { return $scope.match_step(steps); };

            this.current_slide = function() { return $scope.current_slide; };

            this.slide_count = function() { return $scope.slide_count; };

            this.section_stack = [$scope.TOC];

            this.current_section = function() { return this.section_stack[this.section_stack.length - 1]; };

            this.enter_section = function(title) {
                /*console.log("ENTER SECTION " + title);*/
                var section = new TocEntry(title);  // {title: title, slides: [], children: []};
                this.current_section().children.push(section);
                this.section_stack.push(section);
                if ($scope.on_section) {
                    $scope.on_section_slides.push(section.own_slide = this.add_slide($scope, false));
                }
            };

            this.leave_section = function() {
                /*console.log("LEAVE SECTION " + this.current_section().title);*/
                this.section_stack.pop();
            };

            this.add_slide = function(slide_scope, not_section_page) {
                var ret = $scope.slide_count;
                $scope.slide_count += 1;
                if (not_section_page) {
                    this.current_section().slides.push(ret);
                }
                /*$scope.all_steps.push([ret, 0]);*/
                $scope.steps_by_slide[ret] = 0;
                $scope.all_slide_scopes[ret] = slide_scope;
                /*console.log("ADD SLIDE... IN ", this.current_section());*/
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
                /*console.log("ensure_steps///steps_by_slide", steps);*/
                /*console.log($scope.steps_by_slide, $scope.step_count);*/
            }

            this.get_toc = function() { /*console.log('get_toc'); console.log($scope.TOC);*/ return $scope.TOC; };

            this.get_scope = function() { return $scope; };

            /*window.onresize = function() { console.log("resize!"); $rootScope.$digest(); };*/
            window.onresize = function() { $rootScope.$digest(); };

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
            scope.clickable = attr.clickable !== undefined;
            scope.go_to_slide = function(sl) {
                /*console.log("got click!", sl);*/
                if (scope.clickable) {
                    presentation.go_to_slide(sl, 0);
                }
            }
        },
        template:
            `<div class="toc" ng-repeat="item in [$parent.TOC]">
                 <ul class="toc" ng-if="item.children.length > 0">
                 <li class="{{item.state}}"
                         ng-repeat="item in item.children">
                         <ng-include src="'toc-item.html'"></ng-include>
                     </li>
                 </ul>
             </div>`
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
        template: '<span ng-if="$parent.on_section"><span ng-bind-html="$parent.section_slide()"></span></span><ng-transclude/>',
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
                /*console.log("ENTERING SLIDE LINK");*/

                scope.with_header = attr.noHeader === undefined;
                scope.with_sidebar = attr.noSidebar === undefined;
                scope.with_footer = attr.noFooter === undefined;
                scope.disable_slide_counter = attr.noSlideCounter !== undefined;

                scope.slide_index = presentation.add_slide(scope, true);
                /*scope.current_slide = function() { return presentation.current_slide(); };*/
                presentation.ensure_steps([]);
            },
            post: function(scope, element, attr, presentation) {
                /*console.log("LINKED SLIDE #" + scope.slide_index + " counting " + (1 + scope.steps_by_slide[scope.slide_index]) + " steps");*/
            }
        },
        /*controller: function() {},*/
        /*template: '<div ng-class="[\'slide\', {\'hidden\': slide_index != current_slide()}]" ng-transclude></div>'*/
        /*templateUrl: 'frame.html'*/
             /*<div ng-if="match_slide(slide_index)">-->*/
        template: `
             <div ng-class="{'hidden': !match_slide(slide_index)}">
               <table class="presentation">
                 <tbody>
                   <tr ng-if="with_header"><td class="header" colspan="3"><div class="header" ng-bind-html="header()"></div></td></tr>
                   <tr>
                     <td ng-if="with_sidebar" class="left-sidebar"><div class="left-sidebar" ng-bind-html="leftSidebar()"></div></td>
                     <td class="slide"><div class="slide" ng-transclude></div></td>
                     <td ng-if="with_sidebar" class="right-sidebar"><div class="right-sidebar" ng-bind-html="rightSidebar()"></div></td>
                   </tr>
                   <tr ng-if="with_footer"><td class="footer" colspan="3"><div class="footer" ng-bind-html="footer()"></div></td></tr>
                 </tbody>
               </table>
             </div>
             `
    };
})

.directive('onSection', function() {
    return {
        restrict: 'E',
        transclude: true,
        require: '^presentation',
        scope: true,
        priority: 1000,
        link: {
            pre: function(scope, element, attr, presentation) {
                /*element.addClass('hidden');*/
                scope.with_header = attr.noHeader === undefined;
                scope.with_sidebar = attr.noSidebar === undefined;
                scope.with_footer = attr.noFooter === undefined;
                scope.disable_slide_counter = attr.noSlideCounter !== undefined;
                presentation.set_onSection();
            },
            post: function(scope, element, attr, presentation) {
                /*console.log("LINKED SLIDE #" + scope.slide_index + " counting " + (1 + scope.steps_by_slide[scope.slide_index]) + " steps");*/
            }
        },
        template: `
             <div ng-if="is_on_section_slide()">
               <table class="presentation">
                 <tbody>
                   <tr ng-if="with_header"><td class="header" colspan="3"><div class="header" ng-bind-html="header()"></div></td></tr>
                   <tr>
                     <td ng-if="with_sidebar" class="left-sidebar"><div class="left-sidebar" ng-bind-html="leftSidebar()"></div></td>
                     <td class="slide"><div class="slide" ng-transclude></div></td>
                     <td ng-if="with_sidebar" class="right-sidebar"><div class="right-sidebar" ng-bind-html="rightSidebar()"></div></td>
                   </tr>
                   <tr ng-if="with_footer"><td class="footer" colspan="3"><div class="footer" ng-bind-html="footer()"></div></td></tr>
                 </tbody>
               </table>
             </div>
            `

    };
})

//.directive('page', function() {
//    return {
//        restrict: 'E',
//        transclude: true,
//        require: '^presentation',
//        /*priority: 700,*/
//        scope: true,
//        link: {
//            pre: function(scope, element, attr, presentation) {
//                console.log("ENTERING PAGE LINK");
//                scope.slide_index = presentation.add_slide();
//                /*scope.current_slide = function() { return presentation.current_slide(); };*/
//                console.log("LINKED PAGE #" + scope.slide_index);
//                presentation.ensure_steps([]);
//            },
//        },
//        /*controller: function() {},*/
//        /*template: '<div ng-class="[\'slide\', {\'hidden\': slide_index != current_slide()}]" ng-transclude></div>'*/
//        /*templateUrl: 'frame.html'*/
//        template: `
//             <div ng-class="{'hidden': !match_slide(slide_index)}">
//             <!--<div ng-if="match_slide(slide_index)">-->
//               <table class="presentation">
//                 <tbody>
//                   <tr><td class="header" colspan="3"><div class="header" ng-bind-html="header()"></div></td></tr>
//                   <tr>
//                     <td class="left-sidebar"><div class="left-sidebar" ng-bind-html="leftSidebar()"></div></td>
//                     <td class="slide"><div class="slide" ng-transclude></div></td>
//                     <td class="right-sidebar"><div class="right-sidebar" ng-bind-html="rightSidebar()"></div></td>
//                   </tr>
//                   <tr><td class="footer" colspan="3"><div class="footer" ng-bind-html="footer()"></div></td></tr>
//                 </tbody>
//               </table>
//             </div>
//             `
//    };
//})

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
        scope: {},
        link: function(scope, element, attr) {
            console.log("progress bar granularity", attr.granularity, attr.granularity === 'step', attr.granularity == 'step');
            scope.use_step = attr.granularity === 'step';
        },
        template: '<div class="progress-bar"><div class="progress-bar-inner" style="width: {{100 * (use_step ? ($parent.global_step + 1) / $parent.step_count : ($parent.current_slide + 1) / $parent.slide_count)}}%;"></div></div>'
    };
})

.directive('block', ['$sce', function($sce) {
    return {
        restrict: 'E',
        transclude: true,
        /*scope: {title: '@'},*/
        scope: {},
        link: function(scope, element, attr) {
            scope.title = $sce.trustAsHtml(attr.title);
        },
        template: `
            <div class="block">
                <div class="block-title"><h1 ng-bind-html="title"></h1></div>
                <div class="block-content" ng-transclude></div>
            </div>
        `
    };
}])

.directive('slideCounter', ['$sce', function($sce) {
    return {
        restrict: 'E',
        require: '^presentation',
        link: function(scope, element, attr) {
            scope.use_step = attr.granularity === 'step';
            if (attr.granularity == 'step') {
                scope.counter = function() {
                    return scope.$parent.global_step + '&nbsp;/&nbsp;' + scope.$parent.step_count;
                };
            } else {
                scope.counter = function() {
                    return scope.$parent.current_slide + '&nbsp;/&nbsp;' + scope.$parent.slide_count;
                };
            }
            scope.render = function() {
                if (!scope.$slide.disable_slide_counter) {
                    return $sce.trustAsHtml(scope.counter());
                } else {
                    return $sce.trustAsHtml('&nbsp;');
                }
            };
        },
        /*template: '<p ng-if="!$slide.disable_slide_counter" class="slide-counter">{{(use_step ? $parent.global_step : $parent.current_slide) + 1}}&nbsp;/&nbsp;{{use_step ? $parent.step_count : $parent.slide_count}}</p>'*/
        template: '<p class="slide-counter" style="" ng-bind-html="render()"></p>'
    };
}])

.directive('talkAuthor', function() { return { restrict: 'E', require: '^presentation', scope: false, template: '<span class="talk-author">{{$parent.talk_author}}</span>' }; })
.directive('talkWhere', function() { return { restrict: 'E', require: '^presentation', scope: false, template: '<span class="talk-where">{{$parent.talk_where}}</span>' }; })
.directive('talkDate', function() { return { restrict: 'E', require: '^presentation', scope: false, template: '<span class="talk-date">{{$parent.talk_date}}</span>' }; })

.directive('talkTitle', function() { return { restrict: 'E', require: '^presentation', scope: false, template: '<h1>{{title}}</h1>' }; })
.directive('talkSubtitle', function() { return { restrict: 'E', require: '^presentation', scope: false, template: '<h2>{{subtitle}}</h2>' }; })


.directive('defaultFooter', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: false,
        template: `
            <div style="text-align: center; width: 100%; padding: 0;">
                <div style="display: inline-block; float: left; padding-top: 0; padding-bottom: 0; padding-left: 1em; padding-right: 1em;"><talk-date/></div>
                <div style="display: inline-block; float: left; padding-top: 0; padding-bottom: 0; padding-left: 1em; padding-right: 1em;"><talk-where/></div>
                <div style="display: inline-block; float: right; padding-top: 0; padding-bottom: 0; padding-left: 1em; padding-right: 1em;"><slide-counter/>&nbsp;</div>
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

.directive('centered', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: false,
        template: '<table class="full"><tr><td class="center" ng-transclude></td></tr></table>'
    };
})

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
                <div style="transform-origin: 0 0; transform: translate({{translate_x}}px, {{translate_y}}px) scale({{scale_x}}, {{scale_y}}) !important; position: absolute; width: 100vw; height: 100vh;"><!-- resizing container -->
                    <div style="display: inline-block;" ng-transclude></div>
                </div>
                <pre ng-if="debug_adjustbox" style="position: absolute; top: 0; left: 0; border: 0; background: rgba(128, 128, 128, .7); padding: 0 2px; margin: 0;">scale({{scale_x.toFixed(2)}}, {{scale_y.toFixed(2)}}) +{{translate_x.toFixed(2)}},{{translate_y.toFixed(2)}}</pre>
            </div>`
    };
})

.directive('slideHeader', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('slideFooter', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('slideLeftSidebar', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
.directive('slideRightSidebar', function() { return { restrict: 'E', link: function(scope, element, attr) { element.addClass('hidden'); }}; })
;
})()
