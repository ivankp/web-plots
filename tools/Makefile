.PHONY: all clean

ifeq (0, $(words $(findstring $(MAKECMDGOALS), clean))) #############

CPPFLAGS := -std=c++17 -Iinclude
CXXFLAGS := -Wall -O3 -flto -fmax-errors=3
# CXXFLAGS := -Wall -g -fmax-errors=3

# generate .d files during compilation
DEPFLAGS = -MT $@ -MMD -MP -MF .build/$*.d

all:

ifneq (, $(shell which root-config))
ROOT_CPPFLAGS := $(shell root-config --cflags \
  | sed 's/-std=[^ ]*//g;s/-I/-isystem /g')
ROOT_LIBDIR   := $(shell root-config --libdir)
ROOT_LDFLAGS  := $(shell root-config --ldflags) -Wl,-rpath,$(ROOT_LIBDIR)
ROOT_LDLIBS   := $(shell root-config --libs)

all: bin/root2json

C_root2json := $(ROOT_CPPFLAGS)
LF_root2json := $(ROOT_LDFLAGS)
L_root2json := $(ROOT_LDLIBS) -lTreePlayer

# to be able to use std::filesystem with gcc 8
ifeq (8, $(shell $(CXX) -dumpversion | sed 's/\..*//'))
L_root2json += -lstdc++fs
endif
endif

#####################################################################

.PRECIOUS: .build/%.o

bin/%: .build/%.o
	@mkdir -pv $(dir $@)
	$(CXX) $(LDFLAGS) $(LF_$*) $(filter %.o,$^) -o $@ $(LDLIBS) $(L_$*)

.build/%.o: src/%.cc
	@mkdir -pv $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(DEPFLAGS) $(C_$*) -c $(filter %.cc,$^) -o $@

-include $(shell find .build -type f -name '*.d' 2>/dev/null)

endif ###############################################################

clean:
	@rm -rfv bin .build

