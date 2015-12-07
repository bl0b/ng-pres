(function() {


var app = angular.module('ngPres', [])
.run(function($templateCache) {
    $templateCache.put("toc-item.html",
            '{{item.title}}' +
                '<ul class="toc" ng-if="item.children.length > 0">' +
                    '<li ng-class="[\'toc-item\', {\'current-toc-item\': item.slides.indexOf(current_slide()) != -1}]" ng-repeat="item in item.children" ng-include="\'toc-item.html\'"></li>' +
                '</ul>' +
    '');
})
.directive('presentation', ['$document', '$rootScope', function($document, $rootScope) {
    return {
        restrict: 'E',
        transclude: true,
        template: '<div><ng-transclude></ng-transclude></div>',
        link: function() {
            console.log('setting up keydown event callback');
            $document.bind('keydown', function(e) {
                /*console.log('Got keydown:', e.keyCode);*/
                $rootScope.$broadcast('keydown', e);
                $rootScope.$broadcast('keydown:' + e.keyCode, e);
            });
        },
        controller: ['$scope', '$document', function($scope, $document) {
            $scope.current_slide = 0;
            $scope.slide_count = 0;
            $scope.TOC = {title:'', slides: [], children: []};

            $scope.next_slide = function() {
                if ($scope.current_slide < ($scope.slide_count - 1)) {
                    console.log('next slide!');
                    $scope.current_slide += 1;
                }
            };

            $scope.previous_slide = function() {
                if ($scope.current_slide > 0) {
                    console.log('previous slide!');
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

            this.section_stack = [$scope.TOC];

            this.current_section = function() { return this.section_stack[this.section_stack.length - 1]; };

            this.enter_section = function(title) {
                console.log("enter section " + title);
                var section = {title: title, slides: [], children: []};
                this.current_section().children.push(section);
                this.section_stack.push(section);
            };

            this.leave_section = function() {
                console.log("leave section " + this.current_section().title);
                this.section_stack.pop();
            };
            
            this.add_slide = function() {
                var ret = $scope.slide_count;
                $scope.slide_count += 1;
                this.current_section().slides.push(ret);
                return ret;
            };

            this.get_toc = function() { console.log('get_toc'); console.log($scope.TOC); return $scope.TOC; };
        }]
    };
}])
.directive('renderToc', function() {
    return {
        restrict: 'E',
        require: '^presentation',
        scope: {currentClass: '@'},
        link: function(scope, element, attr, presentation) {
            scope.current_slide = function() {
                /*scope.item = scope.$parent.item;*/
                return presentation.current_slide();
            };
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
            console.log(attr);
            console.log(scope);
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
        /*link: function(scope, element, attr) {*/
            /*console.log("section", scope, attr);*/
            /*scope.title = attr.title;*/
        /*},*/
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
            scope.current_slide = function() {
                var ret = presentation.current_slide();
                /*console.log('current_slide ' + ret);*/
                return ret;
            };
            /*console.log("slide index " + scope.slide_index);*/
        },
        template: '<div ng-if="slide_index == current_slide()"><p>slide_index {{slide_index}} ({{current_slide()}})</p><ng-transclude></ng-transclude></div>'
    };
})
;
})()
