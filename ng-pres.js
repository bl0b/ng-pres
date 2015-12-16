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

var app = angular.module('ngPres', [])
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
    $templateCache
        .put("presentation.html",
             `<adjustbox maintain-aspect style="width: 100vw; height: 100vh;">
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
             </adjustbox>`);
})
.directive('presentation', ['$document', '$rootScope', function($document, $rootScope) {
    return {
        restrict: 'E',
        transclude: {
            'header': '?header',
            'leftSidebar': '?leftSidebar',
            'rightSidebar': '?rightSidebar',
            'footer': '?footer'
        },
        templateUrl: "presentation.html", //'<div class="presentation"><ng-transclude></ng-transclude></div>',
        link: function(scope, element, attr) {
            console.log('setting up keydown event callback');
            $document.bind('keydown', function(e) {
                /*console.log('Got keydown:', e.keyCode);*/
                $rootScope.$broadcast('keydown', e);
                $rootScope.$broadcast('keydown:' + e.keyCode, e);
                /*scope.$digest();*/
                
            });
        },
        /*link: {*/
            /*pre: function(scope, element, attr, controller) {*/
                /*scope.tocHilight = attr.tocHilight;*/
            /*}*/
        /*},*/
        controller: ['$scope', '$document', '$element', function($scope, $document, $element) {
            console.log($element);
            $scope.slideBullet = opt_attr($element, 'slide-bullet', '');
            $scope.slideBulletActive = opt_attr($element, 'slide-bullet-active', '');
            $scope.talk_author = opt_attr($element, 'author', '');
            $scope.talk_date = opt_attr($element, 'date', '');
            $scope.talk_where = opt_attr($element, 'where', '');
            attr = $element[0].attributes;
            $scope.slideBullet = attr['slide-bullet'].value;
            $scope.slideBulletActive = attr['slide-bullet-active'].value;
            $scope.current_slide = 0;
            $scope.slide_count = 0;
            $scope.TOC = {title:'', slides: [], children: []};

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
            
            $scope.$on('keydown:37', function(onEvent, keypressEvent) {
                $scope.$apply($scope.previous_slide());
            });
            $scope.$on('keydown:39', function(onEvent, keypressEvent) {
                $scope.$apply($scope.next_slide());
            });
            this.current_slide = function() { return $scope.current_slide; };

            this.slide_count = function() { return $scope.slide_count; };

            this.section_stack = [$scope.TOC];

            this.current_section = function() { return this.section_stack[this.section_stack.length - 1]; };

            this.enter_section = function(title) {
                /*console.log("enter section " + title);*/
                var section = {title: title, slides: [], children: []};
                this.current_section().children.push(section);
                this.section_stack.push(section);
            };

            this.leave_section = function() {
                /*console.log("leave section " + this.current_section().title);*/
                this.section_stack.pop();
            };
            
            this.add_slide = function() {
                var ret = $scope.slide_count;
                $scope.slide_count += 1;
                this.current_section().slides.push(ret);
                return ret;
            };

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
.directive('enterSection', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: {title:"@"},
        link: function(scope, element, attr, presentation) {
            /*console.log(attr);*/
            /*console.log(scope);*/
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
.directive('section', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {title:"@"},
        template: '<enter-section title="{{title}}"></enter-section><ng-transclude></ng-transclude><leave-section></leave-section>',
    };
})
.directive('slide', function() {
    return {
        restrict: 'E',
        transclude: true,
        require: '^presentation',
        scope: {},
        link: function(scope, element, attr, presentation) {
            scope.slide_index = presentation.add_slide();
        },
        template: '<div class="slide" ng-if="slide_index == $parent.current_slide"><ng-transclude></ng-transclude></div>'
    };
})
.directive('progressBar', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        template: '<div class="progress-bar"><div class="progress-bar-inner" style="width: {{100 * ($parent.current_slide + 1) / $parent.slide_count}}%;"></div></div>'
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
        template: '<p class="slide-counter">{{$parent.current_slide + 1}}&nbsp;/&nbsp;{{$parent.slide_count}}</p>'
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
            <div style="text-align: center;">
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

.directive('viewport', function() {
    return {
        restrict: 'E',
        transclude: true,
        link: function($scope, element, attr) {
            console.log("VIEWPORT LINK", element, attr);
            $scope.virtual_width = opt_attr(element, 'virtual-width', 0);
            $scope.virtual_height = opt_attr(element, 'virtual-height', 0);
            $scope.virtual_aspect = opt_attr(element, 'virtual-aspect', 0);
            /*$scope.width = element[0].attributes['width'].value;*/
            /*$scope.height = element[0].attributes['height'].value;*/
            if ($scope.virtual_width == 0) {
                $scope.virtual_width = $scope.virtual_height * $scope.virtual_aspect;
            } else if ($scope.virtual_height == 0) {
                $scope.virtual_height = $scope.virtual_width / $scope.virtual_aspect;
            } else if ($scope.virtual_aspect == 0) {
                $scope.virtual_aspect = $scope.virtual_width / $scope.virtual_height;
            }
            console.log($scope);
            $scope.recalc_transform = function(old_val, new_val) {
                console.log(new_val);
                if (old_val != new_val) {
                    width = new_val[0];
                    height = new_val[1];
                    if (width / height > $scope.virtual_aspect) {
                        $scope.translate_y = 0;
                        $scope.translate_x = (height - width / $scope.virtual_aspect) * .5;
                        $scope.scale = height / $scope.virtual_height;
                    } else {
                        $scope.translate_x = 0;
                        $scope.translate_y = (width - height * $scope.virtual_aspect) * .5;
                        $scope.scale = width / $scope.virtual_width;
                    }
                }
                $scope.width = width;
                $scope.height = height;
            };
            console.log(element);
            $scope.$watch(function () { return [get_value(element[0].style.width), get_value(element[0].style.height)]; }, $scope.recalc_transform, true);
            $scope.recalc_transform(undefined, [get_value(element[0].style.width), get_value(element[0].style.height)]);
        },
        template: `<div style="position: relative; width: {{width}}px; height: {{height}}px; border: 1px solid red; overflow: hidden;">
                <div style="position: absolute; height: {{virtual_height}}px; width: {{virtual_width}}px; transform-origin: 0 0; transform: scale({{scale}}, {{scale}}) translate({{translate_x}}px, {{translate_y}}px); border: 1px solid blue; overflow: hidden;" ng-transclude></div>
            </div>`
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
            console.log("ADJUSTBOX\n", element, attr, scope);
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
                console.log("WATCH!\n", new_val);
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
            <div class="{{class}}" style="align: center; overflow: hidden; {{style}}"><!-- positioning container -->
                <div style="transform-origin: 0 0; transform: translate({{translate_x}}px, {{translate_y}}px) scale({{scale_x}}, {{scale_y}}); position: absolute; width: 100vw; height: 100vh; overflow: hidden;"><!-- resizing container -->
                    <div style="display: inline-block;" ng-transclude></div>
                </div>
            </div>`
    };
})

;
})()
